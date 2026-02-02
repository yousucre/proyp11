import { useState, useEffect } from 'react';
import { Plus, Table as TableIcon, Save, Edit2, Trash2, Settings, FileText, X, AlertCircle } from 'lucide-react';
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

    useEffect(() => {
        loadData();
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
                console.log('Tipos de actividad cargados:', tiposList?.length);
                setTipos(tiposList || []);
            } catch (tipoErr) {
                console.error('Error cargando tipos de actividad:', tipoErr);
                // No detenemos la carga si fallan los tipos
            }

            // Cargar registros
            console.log('Slicitando registros a la API...');
            const data = await otraGestionApi.getAll();
            console.log('Registros recibidos:', data?.length);
            setRecords(data || []);
        } catch (err: any) {
            console.error('Error fatal detectado en loadData:', err);
            setError(`Error al conectar con el servidor: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
            console.log('--- Finaliza carga de datos ---');
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
