import { useState, useEffect } from 'react';
import { Plus, Table as TableIcon, Save, Edit2, Trash2, Settings, FileText, X, AlertCircle, Search, Calendar, Filter, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { otraGestionApi } from '../api/otraGestion';
import { OtraGestion, TipoActividad } from '../db/types';

export default function OtrasGestiones() {
    const [view, setView] = useState<'form' | 'list'>('form');
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<OtraGestion[]>([]);
    const [tipos, setTipos] = useState<TipoActividad[]>([]);
    const [showConfig, setShowConfig] = useState(false);
    const [newTipo, setNewTipo] = useState('');
    const [editingTipo, setEditingTipo] = useState<TipoActividad | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Omit<OtraGestion, 'id' | 'fecha'>>({
        cedula: '',
        nombres: '',
        telefono: '',
        entidad: '',
        actividad: '',
        observaciones: ''
    });

    const [editingRecord, setEditingRecord] = useState<OtraGestion | null>(null);

    // Filtros y Ordenamiento
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterActivity, setFilterActivity] = useState('');
    const [sortBy, setSortBy] = useState<'fecha' | 'nombres' | 'entidad' | 'cedula'>('fecha');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filteredCount, setFilteredCount] = useState(0);

    useEffect(() => {
        // Initial load only loads types, data load is handled by filter effect
        const loadTypes = async () => {
            try {
                const tiposList = await otraGestionApi.getTiposActividad();
                setTipos(tiposList || []);
            } catch (tipoErr) {
                console.error('Error cargando tipos de actividad:', tipoErr);
            }
        };
        loadTypes();
        // Trigger initial load via filter effect
    }, []);

    useEffect(() => {
        console.log('Current view changed to:', view);
    }, [view]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        console.log('--- Inicia carga de datos en Otras Gestiones ---');
        try {
            // Cargar tipos de actividad de forma independiente
            try {
                const tiposList = await otraGestionApi.getTiposActividad();
                setTipos(tiposList || []);
            } catch (tipoErr) {
                console.error('Error cargando tipos de actividad:', tipoErr);
            }

            // Cargar registros con filtros
            const params = {
                search: searchTerm,
                startDate: filterDateStart,
                endDate: filterDateEnd,
                activity: filterActivity,
                sortBy,
                order: sortOrder
            };

            console.log('Solicitando registros a la API con params:', params);
            const data = await otraGestionApi.getAll(params);
            console.log('Registros recibidos:', data?.length);
            setRecords(data || []);
            setFilteredCount(data?.length || 0);
        } catch (err: any) {
            console.error('Error fatal detectado en loadData:', err);
            setError(`Error al conectar con el servidor: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
            console.log('--- Finaliza carga de datos ---');
        }
    };

    // Efecto para recargar cuando cambian los filtros
    useEffect(() => {
        if (view === 'list') {
            const timer = setTimeout(() => {
                loadData();
            }, 500); // Debounce para búsqueda
            return () => clearTimeout(timer);
        }
    }, [searchTerm, filterDateStart, filterDateEnd, filterActivity, sortBy, sortOrder, view]);

    const exportToPDF = async () => {
        setLoading(true);
        try {
            const config = await otraGestionApi.getSystemConfig();
            const doc = new jsPDF();

            // Configuración de cabecera con logo si existe
            if (config?.entidad_logo) {
                // Si hay logo podrías añadirlo aquí, por ahora vamos con texto premium
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            const title = config?.entidad_nombre || 'Reporte de Otras Gestiones';
            doc.text(title, 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(`Nit: ${config?.entidad_nit || 'N/A'} | Email: ${config?.entidad_email || 'N/A'}`, 105, 28, { align: 'center' });

            doc.setDrawColor(200);
            doc.line(14, 35, 196, 35);

            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text('Detalle de Actividades Registradas', 14, 45);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 52);

            if (filterDateStart || filterDateEnd) {
                doc.text(`Periodo: ${filterDateStart || 'Inicial'} hasta ${filterDateEnd || 'Actual'}`, 14, 58);
            }

            const tableColumn = ["Fecha", "Identificación", "Nombres", "Entidad", "Actividad"];
            const tableRows = records.map(record => [
                new Date(record.fecha).toLocaleDateString(),
                record.cedula,
                record.nombres,
                record.entidad,
                record.actividad
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 65,
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: {
                    fillColor: [30, 64, 175],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { top: 65 }
            });

            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Página ${i} de ${pageCount} - Generado por Sistema PQR`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }

            doc.save(`reporte_otras_gestiones_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('Error al exportar PDF:', err);
            alert('Error al generar el reporte PDF');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingRecord) {
                await otraGestionApi.update(editingRecord.id!, formData);
                alert('Registro actualizado correctamente');
                setEditingRecord(null);
            } else {
                await otraGestionApi.create(formData);
                alert('Actividad registrada correctamente');
            }
            setFormData({ cedula: '', nombres: '', telefono: '', entidad: '', actividad: '', observaciones: '' });
            await loadData();
            setView('list');
        } catch (err) {
            alert('Error al guardar el registro');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record: OtraGestion) => {
        setEditingRecord(record);
        setFormData({
            cedula: record.cedula,
            nombres: record.nombres,
            telefono: record.telefono,
            entidad: record.entidad,
            actividad: record.actividad,
            observaciones: record.observaciones || ''
        });
        setView('form');
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que desea eliminar este registro?')) return;
        try {
            await otraGestionApi.delete(id);
            await loadData();
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    const handleAddTipo = async () => {
        if (!newTipo.trim()) return;
        await otraGestionApi.addTipoActividad(newTipo);
        setNewTipo('');
        const list = await otraGestionApi.getTiposActividad();
        setTipos(list);
    };

    const handleUpdateTipo = async () => {
        if (!editingTipo || !newTipo.trim()) return;
        await otraGestionApi.updateTipoActividad(editingTipo.id!, newTipo);
        setEditingTipo(null);
        setNewTipo('');
        const list = await otraGestionApi.getTiposActividad();
        setTipos(list);
    };

    const handleDeleteTipo = async (id: number) => {
        if (!confirm('¿Eliminar este tipo de actividad?')) return;
        await otraGestionApi.deleteTipoActividad(id);
        const list = await otraGestionApi.getTiposActividad();
        setTipos(list);
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Otras Gestiones</h2>
                    <p className="text-slate-600">Registro y seguimiento de actividades adicionales.</p>
                </div>
                <div className="flex gap-2">
                    {view === 'list' && (
                        <button
                            onClick={exportToPDF}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-all shadow-md"
                            title="Descargar PDF"
                        >
                            <Download size={20} />
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowConfig(true)}
                        className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-slate-200 bg-white transition-all shadow-sm"
                        title="Configurar Actividades"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (view === 'list') {
                                setEditingRecord(null);
                                setFormData({ cedula: '', nombres: '', telefono: '', entidad: '', actividad: '', observaciones: '' });
                                setView('form');
                            } else {
                                loadData();
                                setView('list');
                            }
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md"
                    >
                        {view === 'form' ? (
                            <><TableIcon size={20} /> Ver Registros</>
                        ) : (
                            <><Plus size={20} /> Nuevo Registro</>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {tipos.length === 0 && view === 'form' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <Settings size={20} />
                    <span>No hay tipos de actividad configurados. Haga clic en el engranaje para añadir una actividad antes de registrar.</span>
                </div>
            )}

            {view === 'list' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    {/* Barra de Filtros Superior */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por Cédula, Nombre o Entidad..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        <div className="flex gap-2 items-center">
                            <Calendar size={18} className="text-slate-400" />
                            <input
                                type="date"
                                value={filterDateStart}
                                onChange={(e) => setFilterDateStart(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Desde"
                            />
                        </div>
                        <div className="flex gap-2 items-center">
                            <Calendar size={18} className="text-slate-400" />
                            <input
                                type="date"
                                value={filterDateEnd}
                                onChange={(e) => setFilterDateEnd(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Hasta"
                            />
                        </div>
                    </div>

                    {/* Barra de Controles e Info */}
                    <div className="flex flex-wrap justify-between items-center gap-4 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2 min-w-[200px]">
                                <Filter size={18} className="text-slate-400" />
                                <select
                                    value={filterActivity}
                                    onChange={(e) => setFilterActivity(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">Todas las Actividades</option>
                                    {tipos.map(t => (
                                        <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">Ordenar:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="fecha">Fecha</option>
                                    <option value="nombres">Nombres</option>
                                    <option value="entidad">Entidad</option>
                                    <option value="cedula">Cédula</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                                    title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                                >
                                    {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border border-blue-100">
                            Resultados encontrados: {filteredCount}
                        </div>
                    </div>
                </div>
            )}

            {view === 'form' ? (
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        {editingRecord ? 'Editar Registro' : 'Registrar Nueva Actividad'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Número de Cédula</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.cedula}
                                    onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50"
                                    placeholder="Ingrese identificación"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Nombres Completos</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.nombres}
                                    onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                                <input
                                    required
                                    type="tel"
                                    value={formData.telefono}
                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50"
                                    placeholder="300 000 0000"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Entidad</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.entidad}
                                    onChange={e => setFormData({ ...formData, entidad: e.target.value })}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50"
                                    placeholder="Nombre de la entidad"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Actividad</label>
                            <select
                                required
                                value={formData.actividad}
                                onChange={e => setFormData({ ...formData, actividad: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50"
                            >
                                <option value="">Seleccione actividad...</option>
                                {tipos
                                    .map(t => (
                                        <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                    ))}

                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Observaciones</label>
                            <textarea
                                rows={4}
                                value={formData.observaciones}
                                onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50"
                                placeholder="Detalles de la gestión realizada..."
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                disabled={loading}
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
                            >
                                <Save size={20} />
                                {editingRecord ? 'Actualizar Registro' : 'Guardar Gestión'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-800">Fecha</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-800">Cédula</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-800">Nombres</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-800">Entidad</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-800">Actividad</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-800">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                <span>Cargando registros...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-400">No hay registros guardados.</td>
                                    </tr>
                                ) : (
                                    records.map((record) => (
                                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {record.fecha ? new Date(record.fecha).toLocaleDateString() : 'Fecha N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-800">{record.cedula}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{record.nombres}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{record.entidad}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                                                    {record.actividad}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(record)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(record.id!)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Configuración */}
            {showConfig && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center text-slate-800">
                            <h3 className="font-bold flex items-center gap-2">
                                <Settings size={20} className="text-blue-600" /> Gestionar Actividades
                            </h3>
                            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-2">
                                <input
                                    value={newTipo}
                                    onChange={e => setNewTipo(e.target.value)}
                                    placeholder="Nueva actividad..."
                                    className="flex-1 p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                <button
                                    onClick={editingTipo ? handleUpdateTipo : handleAddTipo}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
                                >
                                    {editingTipo ? 'Actualizar' : 'Añadir'}
                                </button>
                                {editingTipo && (
                                    <button
                                        onClick={() => { setEditingTipo(null); setNewTipo(''); }}
                                        className="p-2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actividades Registradas</span>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {tipos
                                    .map(t => (

                                        <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group transition-all hover:bg-slate-100">
                                            <span className="text-sm font-medium text-slate-700">{t.nombre}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingTipo(t); setNewTipo(t.nombre); }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTipo(t.id!)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white"
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
