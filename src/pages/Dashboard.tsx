import { useState, useEffect } from 'react';
import { dashboardApi } from '../api/dashboard';
import type { DashboardStats, QuickNote } from '../db/types';
import { Plus, Trash2, GripVertical, Check, X, FileText, Clock, CheckCircle, BarChart3, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </div>
);

const SortableNote = ({ note, onDelete, onUpdate }: { note: QuickNote, onDelete: (id: number) => void, onUpdate: (id: number, text: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(note.texto);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: note.id! });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSave = () => {
        onUpdate(note.id!, editText);
        setIsEditing(false);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-yellow-50 p-4 rounded-lg border border-yellow-200 shadow-sm mb-3 flex items-start gap-3 transition-all hover:shadow-md ${isDragging ? 'shadow-xl rotate-1' : ''}`}
        >
            <button {...attributes} {...listeners} className="mt-1 text-yellow-400 cursor-grab active:cursor-grabbing hover:text-yellow-600">
                <GripVertical size={18} />
            </button>
            <div className="flex-1">
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full text-sm bg-white p-2 border border-yellow-300 rounded focus:ring-1 focus:ring-yellow-400 outline-none"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                            <button onClick={() => { setIsEditing(false); setEditText(note.texto); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={16} /></button>
                        </div>
                    </div>
                ) : (
                    <p
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-slate-700 leading-relaxed cursor-text whitespace-pre-wrap"
                    >
                        {note.texto}
                    </p>
                )}
            </div>
            {!isEditing && (
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(note.id!); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white transition-colors"
                        title="Eliminar nota"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            )}
        </div>
    );
};

import { useConfig } from '../contexts/ConfigContext';

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [pendingPQRs, setPendingPQRs] = useState<any[]>([]);
    const [notes, setNotes] = useState<QuickNote[]>([]);
    const [newNoteText, setNewNoteText] = useState('');
    const [loading, setLoading] = useState(true);
    const { logout } = useAuth();
    const { config, logoUrl } = useConfig();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch stats first as they are critical for the main render
            const statsData = await dashboardApi.getStats();
            setStats(statsData);

            // Fetch other data in parallel
            const [pendingRes, notesRes] = await Promise.allSettled([
                dashboardApi.getPending(),
                dashboardApi.getNotes()
            ]);

            if (pendingRes.status === 'fulfilled') {
                setPendingPQRs(pendingRes.value);
            }

            if (notesRes.status === 'fulfilled') {
                setNotes(notesRes.value);
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newNoteText.trim()) return;

        try {
            await dashboardApi.addNote(newNoteText);
            setNewNoteText('');
            loadNotes();
        } catch (err) {
            console.error(err);
        }
    };

    const loadNotes = async () => {
        const savedNotes = await dashboardApi.getNotes();
        setNotes(savedNotes);
    };

    const handleDeleteNote = async (id: number) => {
        await dashboardApi.deleteNote(id);
        loadNotes();
    };

    const handleUpdateNote = async (id: number, text: string) => {
        await dashboardApi.updateNote(id, text);
        loadNotes();
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = notes.findIndex(n => n.id === active.id);
            const newIndex = notes.findIndex(n => n.id === over.id);
            const newNotes = arrayMove(notes, oldIndex, newIndex);
            setNotes(newNotes);
            await dashboardApi.reorderNotes(newNotes.map((n, i) => ({ id: n.id!, posicion: i })));
        }
    };


    const getDaysRemaining = (fechaVencimiento: string) => {
        const diff = new Date(fechaVencimiento).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    if (loading) return <div>Cargando estadísticas...</div>;
    if (!stats) return <div>No hay datos disponibles.</div>;

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Dashboard General</h2>
                <div className="flex gap-2">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                        <LogOut size={16} />
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Identidad Visual (Solo Lectura) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-32 h-32 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo Entidad" className="w-full h-full object-contain p-2" />
                        ) : (
                            <Building2 className="w-12 h-12 text-slate-300" />
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl font-bold text-slate-800">
                            {config?.entidad_nombre || 'Nombre de la Entidad'}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Bienvenido al sistema de gestión de PQRS y Expedientes.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total PQR" value={stats.total} icon={FileText} color="bg-blue-500" />
                <StatCard title="Expedientes" value={stats.expedientes} icon={Clock} color="bg-orange-500" />
                <StatCard title="Respondidas" value={stats.byStatus.find(s => s.estado === 'Respondida')?.count || 0} icon={CheckCircle} color="bg-green-500" />
                <StatCard title="En Trámite" value={stats.byStatus.find(s => s.estado === 'En Trámite')?.count || 0} icon={BarChart3} color="bg-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Notas Rápidas (Pendientes)</h3>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Arrastra para reordenar</span>
                    </div>

                    <form onSubmit={handleAddNote} className="mb-6 flex gap-2">
                        <input
                            type="text"
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            placeholder="Añadir una nota rápida..."
                            className="flex-1 text-sm p-3 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all border-slate-200"
                        />
                        <button
                            type="submit"
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 flex items-center justify-center"
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={notes.map(n => n.id!)}
                                strategy={verticalListSortingStrategy}
                            >
                                {notes.map((note) => (
                                    <SortableNote
                                        key={note.id}
                                        note={note}
                                        onDelete={handleDeleteNote}
                                        onUpdate={handleUpdateNote}
                                    />
                                ))}
                                {notes.length === 0 && (
                                    <div className="text-center py-10 text-slate-400">
                                        <Plus className="mx-auto mb-2 opacity-20" size={40} />
                                        <p className="italic text-sm">No hay notas registradas</p>
                                    </div>
                                )}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">PQRs Próximas a Vencer</h3>
                    <div className="overflow-auto max-h-64">
                        <table className="w-full text-sm text-left">
                            <thead className="sticky top-0 bg-white border-b text-slate-500 font-medium">
                                <tr>
                                    <th className="pb-2">Radicado</th>
                                    <th className="pb-2">Vencimiento</th>
                                    <th className="pb-2 text-right">Días</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pendingPQRs.map(p => {
                                    const days = getDaysRemaining(p.fecha_vencimiento);
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="py-2 font-medium">{p.radicado}</td>
                                            <td className="py-2 text-slate-500">{new Date(p.fecha_vencimiento).toLocaleDateString()}</td>
                                            <td className={`py-2 text-right font-bold ${days <= 3 ? 'text-red-500' : 'text-slate-700'}`}>
                                                {days}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {pendingPQRs.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-slate-400 italic">No hay trámites pendientes</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
