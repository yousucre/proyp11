import { useState, useEffect } from 'react';
import { Plus, Folder, FileText, Edit2, Trash2, Check, X, Settings, Filter, Download } from 'lucide-react';
import { db } from '../db/database';
import { TipoExpediente } from '../db/types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Expedientes() {
    const [expedientes, setExpedientes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        numero_expediente: '',
        titulo: '',
        tipo: '',
        descripcion: ''
    });
    const [attachment, setAttachment] = useState<File | null>(null);
    const [selectedExpediente, setSelectedExpediente] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [docFormData, setDocFormData] = useState({ descripcion: '' });
    const [docAttachment, setDocAttachment] = useState<File | null>(null);
    const [showDocModal, setShowDocModal] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');

    const [tipos, setTipos] = useState<TipoExpediente[]>([]);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [newTipoName, setNewTipoName] = useState('');
    const [editingTipo, setEditingTipo] = useState<TipoExpediente | null>(null);
    const [filterTipo, setFilterTipo] = useState('');
    const [filterEstado, setFilterEstado] = useState('Abierto');
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const tiposList = await db.getTiposExpediente();
            setTipos(tiposList);
            await loadExpedientes();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadExpedientes = async () => {
        try {
            const filters: any = {};
            if (filterTipo) filters.tipo = filterTipo;
            if (filterEstado) filters.estado = filterEstado;
            const data = await db.getExpedientes(filters);
            setExpedientes(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadExpedientes();
    }, [filterTipo, filterEstado]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { id } = await db.createExpediente({
                ...formData
            });

            // If there's an initial attachment, add it as the first document
            if (attachment && id) {
                const docId = await db.addDocumentToExpediente({
                    id_expediente: id,
                    nombre_archivo: attachment.name,
                    blob_archivo: attachment,
                    descripcion: formData.descripcion || 'Documento inicial'
                });
                await db.addLogToExpediente({
                    id_expediente: id,
                    accion: 'Registro inicial',
                    detalle: `Se creó expediente con archivo: ${attachment.name}. REF: ${formData.descripcion || 'Sin descripción'}`,
                    adjunto_id: docId
                });
            } else {
                await db.addLogToExpediente({
                    id_expediente: id,
                    accion: 'Apertura',
                    detalle: `Se creó el expediente administrativo. ${formData.descripcion ? ' REF: ' + formData.descripcion : ''}`
                });
            }

            setShowModal(false);
            setFormData({ numero_expediente: '', titulo: '', tipo: '', descripcion: '' });
            setAttachment(null);
            loadExpedientes();
        } catch (err) {
            alert('Error al crear expediente');
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async (id: number) => {
        const docs = await db.getExpedienteDocuments(id);
        const logData = await db.getExpedienteLogs(id);
        setDocuments(docs);
        setLogs(logData);
    };

    const handleSelectExpediente = async (exp: any) => {
        setSelectedExpediente(exp);
        setEditedTitle(exp.titulo);
        setIsEditingTitle(false);
        await loadDocuments(exp.id);
    };

    const handleSaveTitle = async () => {
        if (!selectedExpediente || !editedTitle.trim()) return;
        try {
            await db.updateExpediente(selectedExpediente.id, { titulo: editedTitle });
            setSelectedExpediente({ ...selectedExpediente, titulo: editedTitle });
            setIsEditingTitle(false);
            loadExpedientes();
        } catch (err) {
            alert('Error al actualizar título');
        }
    };

    const handleDeleteDocument = async (docId: number) => {
        if (!confirm('¿Está seguro de eliminar este documento?')) return;
        try {
            await db.deleteDocumentToExpediente(docId);
            await loadDocuments(selectedExpediente.id);
        } catch (err) {
            alert('Error al eliminar documento');
        }
    };

    const handleUpdateState = async (newState: string) => {
        if (!selectedExpediente) return;
        try {
            await db.updateExpediente(selectedExpediente.id, { estado: newState });
            setSelectedExpediente({ ...selectedExpediente, estado: newState });
            loadExpedientes();
        } catch (err) {
            alert('Error al actualizar estado');
        }
    };

    const handleAddDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!docAttachment || !selectedExpediente) return;
        setLoading(true);
        try {
            const docId = await db.addDocumentToExpediente({
                id_expediente: selectedExpediente.id,
                nombre_archivo: docAttachment.name,
                blob_archivo: docAttachment,
                descripcion: docFormData.descripcion
            });
            await db.addLogToExpediente({
                id_expediente: selectedExpediente.id,
                accion: 'Adición de archivo',
                detalle: `Archivo: ${docAttachment.name}. REF: ${docFormData.descripcion}`,
                adjunto_id: docId
            });
            setDocFormData({ descripcion: '' });
            setDocAttachment(null);
            setShowDocModal(false);
            await loadDocuments(selectedExpediente.id);
        } catch (err) {
            alert('Error al subir documento');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                alert('Solo se permiten archivos PDF');
                e.target.value = '';
                return;
            }
            setAttachment(file);
        }
    };


    const handleAddTipo = async () => {
        if (!newTipoName.trim()) return;
        try {
            await db.addTipoExpediente(newTipoName);
            setNewTipoName('');
            const list = await db.getTiposExpediente();
            setTipos(list);
        } catch (err) {
            alert('Error al añadir tipo');
        }
    };

    const handleUpdateTipo = async () => {
        if (!editingTipo || !newTipoName.trim()) return;
        try {
            await db.updateTipoExpediente(editingTipo.id!, newTipoName);
            setEditingTipo(null);
            setNewTipoName('');
            const list = await db.getTiposExpediente();
            setTipos(list);
        } catch (err) {
            alert('Error al actualizar tipo');
        }
    };

    const handleDeleteTipo = async (id: number) => {
        if (!confirm('¿Seguro que desea eliminar este tipo?')) return;
        try {
            await db.deleteTipoExpediente(id);
            const list = await db.getTiposExpediente();
            setTipos(list);
        } catch (err) {
            alert('Error al eliminar tipo');
        }
    };

    const exportBitacoraPDF = () => {
        if (!selectedExpediente) return;

        const doc = new jsPDF();
        const title = `BITACORA DE EXPEDIENTE: ${selectedExpediente.numero_expediente}`;
        const subtitle = `Asunto: ${selectedExpediente.titulo}`;
        const dateGen = `Fecha de generación: ${new Date().toLocaleString()}`;

        doc.setFontSize(16);
        doc.text(title, 14, 20);
        doc.setFontSize(10);
        doc.text(subtitle, 14, 28);
        doc.text(dateGen, 14, 34);
        doc.text(`Estado: ${selectedExpediente.estado} | Tipo: ${selectedExpediente.tipo}`, 14, 40);

        const tableData = logs.map(log => [
            new Date(log.fecha).toLocaleString(),
            log.accion,
            log.detalle
        ]);

        autoTable(doc, {
            head: [['Fecha / Hora', 'Acción', 'Descripción / Detalle']],
            body: tableData,
            startY: 45,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save(`Bitacora_${selectedExpediente.numero_expediente}.pdf`);
    };

    return (
        <div className="space-y-6">
            {!selectedExpediente ? (
                <>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Expedientes Administrativos</h2>
                            <p className="text-slate-600">Gestión de carpetas y archivos administrativos.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowSettingsModal(true)}
                                className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-slate-200 bg-white transition-all shadow-sm"
                                title="Configurar Tipos"
                            >
                                <Settings size={20} />
                            </button>
                            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all">
                                <Plus size={20} /> Nuevo Expediente
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Filter size={18} />
                                <span className="text-sm font-medium">Tipo:</span>
                            </div>
                            <select
                                value={filterTipo}
                                onChange={e => setFilterTipo(e.target.value)}
                                className="text-sm border rounded-lg px-3 py-1.5 outline-none focus:ring-2 ring-blue-500 bg-slate-50"
                            >
                                <option value="">Todos los tipos</option>
                                {tipos.map(t => (
                                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-slate-500">
                                <span className="text-sm font-medium">Estado:</span>
                            </div>
                            <select
                                value={filterEstado}
                                onChange={e => setFilterEstado(e.target.value)}
                                className="text-sm border rounded-lg px-3 py-1.5 outline-none focus:ring-2 ring-blue-500 bg-slate-50"
                            >
                                <option value="">Todos los Estados</option>
                                <option value="Abierto">Abiertos</option>
                                <option value="Cerrado">Cerrados</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {expedientes.map((exp) => (
                            <div key={exp.id} onClick={() => handleSelectExpediente(exp)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 cursor-pointer transition-all group">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Folder size={24} />
                                    </div>
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md">{exp.tipo}</span>
                                </div>
                                <h3 className="mt-4 font-bold text-slate-800">{exp.titulo}</h3>
                                <p className="text-sm text-slate-500 mt-1">{exp.numero_expediente}</p>
                                <p className="text-sm text-slate-600 mt-3 line-clamp-2">{exp.descripcion}</p>
                                <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-slate-400">
                                    <span>{new Date(exp.fecha_apertura).toLocaleDateString()}</span>
                                    <span className="text-blue-600 font-medium">Abrir Carpeta</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    <button onClick={() => setSelectedExpediente(null)} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium">
                        ← Volver a Expedientes
                    </button>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-6 border-b pb-4">
                            <div className="flex-1">
                                {isEditingTitle ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={editedTitle}
                                            onChange={e => setEditedTitle(e.target.value)}
                                            className="text-2xl font-bold text-slate-800 border-b-2 border-blue-500 outline-none bg-slate-50 px-2 py-1 flex-1"
                                            autoFocus
                                        />
                                        <button onClick={handleSaveTitle} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                                            <Check size={24} />
                                        </button>
                                        <button onClick={() => { setIsEditingTitle(false); setEditedTitle(selectedExpediente.titulo); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                            <X size={24} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 w-full">
                                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                            <Folder className="text-blue-600" /> {selectedExpediente.titulo}
                                        </h2>
                                        <button onClick={() => setIsEditingTitle(true)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Título">
                                            <Edit2 size={18} />
                                        </button>

                                        <div className="ml-auto flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Estado:</span>
                                            <select
                                                value={selectedExpediente.estado}
                                                onChange={(e) => handleUpdateState(e.target.value)}
                                                className={`text-xs font-bold px-2 py-1 rounded border outline-none
                                                    ${selectedExpediente.estado === 'Abierto' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                            >
                                                <option value="Abierto">Abierto</option>
                                                <option value="Cerrado">Cerrado</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                <p className="text-slate-500 mt-1">Expediente N°: {selectedExpediente.numero_expediente}</p>
                            </div>
                            <button
                                onClick={() => setShowDocModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shrink-0 ml-4"
                            >
                                <Plus size={20} /> Adicionar Archivo
                            </button>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 uppercase">Documentos en la Carpeta</h4>
                            <div className="grid grid-cols-1 gap-4">
                                {documents.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="p-2 bg-white rounded-lg border text-red-500">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{doc.nombre_archivo}</p>
                                                <p className="text-xs text-slate-500">{doc.descripcion || 'Sin descripción'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400">{new Date(doc.fecha_subida).toLocaleString()}</span>
                                            <button
                                                onClick={() => {
                                                    const url = URL.createObjectURL(doc.blob_archivo);
                                                    window.open(url, '_blank');
                                                }}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                            >
                                                Ver / Descargar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDocument(doc.id!)}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {documents.length === 0 && (
                                    <div className="py-10 text-center text-slate-400 italic bg-white border border-dashed rounded-xl">
                                        Esta carpeta está vacía. Use el botón "Adicionar Archivo" para subir documentos.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                                    <FileText className="text-blue-500" size={18} /> Bitácora de Actuaciones
                                </h4>
                                <button
                                    onClick={exportBitacoraPDF}
                                    className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Download size={14} /> Descargar PDF
                                </button>
                            </div>
                            <div className="space-y-4">
                                {logs.map((log) => (
                                    <div key={log.id} className="border-l-2 border-blue-500 pl-4 py-2 relative">
                                        <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-blue-500"></div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-blue-700">{log.accion}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(log.fecha).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{log.detalle}</p>
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <p className="text-center text-slate-400 italic text-sm py-4">No hay registros en la bitácora.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {expedientes.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500">
                    No hay expedientes registrados.
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
                        <h3 className="text-xl font-bold text-slate-800">Crear Nuevo Expediente</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Número Expediente</label>
                                <input required value={formData.numero_expediente} onChange={e => setFormData({ ...formData, numero_expediente: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="EXP-2024-001" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Título / Asunto</label>
                                <input required value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Tipo de Expediente</label>
                                <select
                                    required
                                    value={formData.tipo}
                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                >
                                    <option value="">Seleccione un tipo...</option>
                                    {tipos.map(t => (
                                        <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Descripción</label>
                                <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} className="w-full p-2 border rounded-lg" rows={3} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Adjuntar PDF</label>
                                <input type="file" accept=".pdf" onChange={handleFileChange} className="w-full text-xs" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    {loading ? 'Guardando...' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Adición de Documento */}
            {showDocModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 underline decoration-blue-500 underline-offset-4">Adicionar Archivo PDF</h3>
                            <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleAddDocument} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Seleccionar PDF</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    required
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            if (e.target.files[0].type !== 'application/pdf') {
                                                alert('Solo se permiten archivos PDF');
                                                e.target.value = '';
                                                return;
                                            }
                                            setDocAttachment(e.target.files[0]);
                                        }
                                    }}
                                    className="w-full text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Descripción / Referencia del PDF</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Ej: Resolución N° 001, Acta de visita, etc."
                                    value={docFormData.descripcion}
                                    onChange={e => setDocFormData({ ...docFormData, descripcion: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 ring-blue-500"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowDocModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? 'Subiendo...' : 'Subir Documento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Configuración de Tipos */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={20} className="text-blue-600" /> Configurar Tipos de Expediente
                            </h3>
                            <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-2">
                                <input
                                    value={newTipoName}
                                    onChange={e => setNewTipoName(e.target.value)}
                                    placeholder="Nombre del tipo..."
                                    className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 text-sm"
                                />
                                <button
                                    onClick={editingTipo ? handleUpdateTipo : handleAddTipo}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                                >
                                    {editingTipo ? 'Actualizar' : 'Adicionar'}
                                </button>
                                {editingTipo && (
                                    <button onClick={() => { setEditingTipo(null); setNewTipoName(''); }} className="p-2 text-slate-400 hover:text-slate-600">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {tipos.map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
                                        <span className="text-sm font-medium text-slate-700">{t.nombre}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingTipo(t); setNewTipoName(t.nombre); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTipo(t.id!)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
