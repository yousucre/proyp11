import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Download, Plus, FileText, Edit, Trash2 } from 'lucide-react';
import { pqrApi } from '../api/pqr';
import { fileToBase64, bufferToBlob } from '../utils/fileUtils';
import { generateBitacoraPDF, generatePQRVoucher } from '../utils/pdfGenerator';

export default function Gestion() {
    const [pqrs, setPqrs] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        radicado: '',
        solicitante: '',
        estado: ''
    });

    const [selectedPqr, setSelectedPqr] = useState<any>(null);
    const [showActionModal, setShowActionModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [actuaciones, setActuaciones] = useState<any[]>([]);
    const [actionData, setActionData] = useState({
        tipo_actuacion: 'Seguimiento',
        observacion: ''
    });
    const [actionAttachment, setActionAttachment] = useState<File | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        handleSearch();
    }, []);

    const handleSearch = async () => {
        try {
            // Fetch all and filter client side for now, or update backend to accept filters
            const allData = await pqrApi.getAll();
            const filtered = allData.filter((p: any) => {
                if (filters.estado && p.estado !== filters.estado) return false;
                if (filters.radicado && !p.radicado.toLowerCase().includes(filters.radicado.toLowerCase())) return false;
                if (filters.solicitante) {
                    const term = filters.solicitante.toLowerCase();
                    const sol = p.solicitante;
                    if (!sol) return false;
                    return sol.nombre_completo.toLowerCase().includes(term) || sol.numero_identificacion.includes(term);
                }
                return true;
            });
            setPqrs(filtered);
        } catch (err) {
            console.error(err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleStatusChange = async (pqrId: number, newStatus: string) => {
        try {
            setLoading(true);
            await pqrApi.update(pqrId, { estado: newStatus });

            // Regenerar el comprobante con el nuevo estado
            const updatedPqr = await pqrApi.getById(pqrId);
            if (updatedPqr) {
                const voucherBlob = await generatePQRVoucher(updatedPqr);
                const voucherBase64 = await fileToBase64(voucherBlob);
                await pqrApi.update(pqrId, { comprobante_pdf: voucherBase64 } as any);
            }

            handleSearch();
        } catch (err) {
            console.error(err);
            alert('Error al actualizar estado y comprobante');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePQR = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar esta PQR? Esta acción eliminará también todo su historial de actuaciones y no se puede deshacer.')) {
            try {
                await pqrApi.delete(id);
                handleSearch();
                alert('PQR eliminada correctamente');
            } catch (err) {
                alert('Error al eliminar PQR');
            }
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editData) return;
        setLoading(true);
        try {
            await pqrApi.update(editData.id, {
                tipo_pqr: editData.tipo_pqr,
                asunto: editData.asunto,
                canal_recepcion: editData.canal_recepcion,
                fecha_vencimiento: editData.fecha_vencimiento ? new Date(editData.fecha_vencimiento) : undefined,
                solicitante: {
                    nombre_completo: editData.solicitante?.nombre_completo || editData.nombre_completo,
                    numero_identificacion: editData.solicitante?.numero_identificacion || editData.numero_identificacion,
                    email: editData.solicitante?.email || editData.email,
                    telefono: editData.solicitante?.telefono || editData.telefono,
                    direccion: editData.solicitante?.direccion || editData.direccion
                }
            } as any);

            // Regenerar comprobante porque la info cambió
            const updatedPqr = await pqrApi.getById(editData.id);
            if (updatedPqr) {
                const voucherBlob = await generatePQRVoucher(updatedPqr);
                const voucherBase64 = await fileToBase64(voucherBlob);
                await pqrApi.update(editData.id, { comprobante_pdf: voucherBase64 } as any);
            }

            setShowEditModal(false);
            handleSearch();
            alert('Registro actualizado correctamente');
        } catch (err) {
            console.error(err);
            alert('Error al actualizar registro');
        } finally {
            setLoading(false);
        }
    };

    const handleActionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPqr) return;
        setLoading(true);
        try {
            let adjuntoBase64 = undefined;
            if (actionAttachment) {
                adjuntoBase64 = await fileToBase64(actionAttachment);
            }

            await pqrApi.createActuacion(selectedPqr.id, {
                ...actionData,
                adjunto_pdf: adjuntoBase64,
                adjunto_nombre: actionAttachment?.name || undefined
            });
            setShowActionModal(false);
            setActionData({ tipo_actuacion: 'Seguimiento', observacion: '' });
            setActionAttachment(null);
            alert('Acción registrada con éxito');
            if (showDetailModal) loadActuaciones(selectedPqr.id);
        } catch (err) {
            alert('Error al registrar acción');
        } finally {
            setLoading(false);
        }
    };

    const loadActuaciones = async (idPqr: number) => {
        const data = await pqrApi.getActuaciones(idPqr);
        setActuaciones(data);
    };

    const handleViewDetail = async (pqr: any) => {
        setSelectedPqr(pqr);
        await loadActuaciones(pqr.id);
        setShowDetailModal(true);
    };

    const downloadPDF = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gestión de Trámites</h2>
                    <p className="text-slate-600">Búsqueda y seguimiento de peticiones.</p>
                </div>
            </div>

            {/* Buscador */}
            <form
                onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end"
            >
                <div className="flex-1 min-w-[150px]">
                    <label className="text-xs font-bold text-slate-500 uppercase">Radicado</label>
                    <div className="flex items-center gap-2 border rounded-lg px-2 py-1.5 focus-within:ring-2 ring-blue-500 mt-1">
                        <Search size={16} className="text-slate-400" />
                        <input
                            name="radicado"
                            value={filters.radicado}
                            onChange={handleChange}
                            placeholder="Buscar por radicado..."
                            className="w-full outline-none text-sm"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-slate-500 uppercase">Solicitante</label>
                    <div className="mt-1">
                        <input
                            name="solicitante"
                            value={filters.solicitante}
                            onChange={handleChange}
                            placeholder="Cédula o Nombre..."
                            className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 ring-blue-500"
                        />
                    </div>
                </div>
                <div className="w-40">
                    <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                    <div className="mt-1">
                        <select
                            name="estado"
                            value={filters.estado}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 ring-blue-500"
                        >
                            <option value="">Todos</option>
                            <option>Registrada</option>
                            <option>En Trámite</option>
                            <option>Respondida</option>
                            <option>Cerrada</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        type="submit"
                        className="bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center gap-2"
                    >
                        <Filter size={16} /> Filtrar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFilters({ radicado: '', solicitante: '', estado: '' });
                            pqrApi.getAll().then(setPqrs);
                        }}
                        className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200"
                    >
                        Limpiar
                    </button>
                </div>
            </form>

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Radicado</th>
                                <th className="px-6 py-3">Fecha/Venc.</th>
                                <th className="px-6 py-3">Nombre Solicitante</th>
                                <th className="px-6 py-3">Identificación</th>
                                <th className="px-6 py-3">Datos Contacto</th>
                                <th className="px-6 py-3">Canal/Tipo</th>
                                <th className="px-6 py-3">Asunto</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-center">Anexos</th>
                                <th className="px-6 py-3 text-center">Comprobante</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pqrs.map((pqr) => (
                                <tr key={pqr.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-800">{pqr.radicado}</td>
                                    <td className="px-6 py-3 text-xs">
                                        <div className="flex flex-col">
                                            <span>R: {new Date(pqr.fecha_radicacion).toLocaleDateString()}</span>
                                            <span className={`font-semibold ${pqr.fecha_vencimiento && new Date(pqr.fecha_vencimiento) < new Date() ? 'text-red-600' : 'text-slate-500'}`}>
                                                V: {pqr.fecha_vencimiento ? new Date(pqr.fecha_vencimiento).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="font-medium text-slate-700 block">{pqr.solicitante?.nombre_completo}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-xs text-slate-600 font-mono">{pqr.solicitante?.numero_identificacion}</span>
                                    </td>
                                    <td className="px-6 py-3 text-xs">
                                        <div className="flex flex-col">
                                            <span title="Teléfono">{pqr.solicitante?.telefono || '-'}</span>
                                            <span title="Email" className="text-blue-600">{pqr.solicitante?.email || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-xs">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{pqr.canal_recepcion}</span>
                                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded mt-1 w-fit">{pqr.tipo_pqr}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-xs max-w-[150px]">
                                        <p className="truncate font-medium" title={pqr.asunto}>{pqr.asunto}</p>
                                        <p className="text-[10px] text-slate-400 truncate mt-0.5" title={pqr.solicitante?.direccion}>{pqr.solicitante?.direccion || 'Sin dirección'}</p>
                                    </td>
                                    <td className="px-6 py-3">
                                        <select
                                            value={pqr.estado}
                                            onChange={(e) => handleStatusChange(pqr.id, e.target.value)}
                                            className={`p-1 rounded border text-xs font-medium outline-none focus:ring-1 ring-blue-500
                                                ${pqr.estado === 'Registrada' ? 'bg-yellow-50 text-yellow-700' :
                                                    pqr.estado === 'Respondida' ? 'bg-green-50 text-green-700' :
                                                        pqr.estado === 'En Trámite' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}
                                        >
                                            <option>Registrada</option>
                                            <option>En Trámite</option>
                                            <option>Respondida</option>
                                            <option>Cerrada</option>
                                            <option>Archivada</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {pqr.adjunto_pdf ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        const blob = bufferToBlob(pqr.adjunto_pdf);
                                                        if (blob) {
                                                            const url = URL.createObjectURL(blob);
                                                            window.open(url, '_blank');
                                                        }
                                                    }}
                                                    className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100"
                                                >
                                                    Ver PDF
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const blob = bufferToBlob(pqr.adjunto_pdf);
                                                        if (blob) downloadPDF(blob, pqr.adjunto_nombre);
                                                    }}
                                                    className="text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Descargar"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {pqr.comprobante_pdf ? (
                                            <button
                                                onClick={() => {
                                                    const blob = bufferToBlob(pqr.comprobante_pdf);
                                                    if (blob) downloadPDF(blob, `comprobante_${pqr.radicado}.pdf`);
                                                }}
                                                className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors text-[10px] font-bold"
                                                title="Descargar Comprobante"
                                            >
                                                <Download size={14} />
                                                PDF
                                            </button>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditData({
                                                        ...pqr,
                                                        fecha_vencimiento: pqr.fecha_vencimiento ? new Date(pqr.fecha_vencimiento).toISOString().split('T')[0] : ''
                                                    });
                                                    setShowEditModal(true);
                                                }}
                                                className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                                title="Editar Registro"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedPqr(pqr); setShowActionModal(true); }}
                                                className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors"
                                                title="Registrar Acción"
                                            >
                                                <Plus size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleViewDetail(pqr)}
                                                className="text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                                                title="Ver Detalles"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePQR(pqr.id)}
                                                className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                title="Eliminar PQR"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {pqrs.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="px-6 py-8 text-center text-slate-400">
                                        No se encontraron resultados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle y Seguimiento */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800">Detalle del Trámite - {selectedPqr?.radicado}</h3>
                                <p className="text-xs text-slate-500">{selectedPqr?.nombre_completo}</p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Panel Izquierdo: Resumen */}
                            <div className="md:col-span-1 space-y-6">
                                <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase">Información General</h4>
                                    <div className="text-sm space-y-2">
                                        <div><span className="text-slate-400 block text-xs">Tipo PQR:</span> {selectedPqr?.tipo_pqr}</div>
                                        <div><span className="text-slate-400 block text-xs">Estado Actual:</span> <span className="font-medium text-blue-600">{selectedPqr?.estado}</span></div>
                                        <div><span className="text-slate-400 block text-xs">Canal:</span> {selectedPqr?.canal_recepcion}</div>
                                        <div className="border-t pt-2 mt-2">
                                            <span className="text-slate-400 block text-xs">Asunto:</span>
                                            <p className="text-slate-700 font-medium">{selectedPqr?.asunto}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowActionModal(true)}
                                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium"
                                >
                                    <Plus size={18} /> Registrar Nueva Acción
                                </button>
                            </div>

                            {/* Panel Derecho: Historial (Bitácora) */}
                            <div className="md:col-span-2 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                                        <FileText size={18} className="text-blue-500" /> Historial de Actuaciones (Bitácora)
                                    </h4>
                                    {actuaciones.length > 0 && (
                                        <button
                                            onClick={async () => await generateBitacoraPDF(selectedPqr, actuaciones)}
                                            className="text-xs flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-bold"
                                        >

                                            <Download size={14} />
                                            DESCARGAR HISTORIAL
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {actuaciones.map((act) => (
                                        <div key={act.id} className="border-l-2 border-blue-500 pl-4 py-2 relative">
                                            <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-blue-500"></div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-bold text-blue-700">{act.tipo_actuacion}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(act.fecha_actuacion).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{act.observacion}</p>
                                            {act.adjunto_pdf && (
                                                <button
                                                    onClick={() => {
                                                        const blob = bufferToBlob(act.adjunto_pdf);
                                                        if (blob) downloadPDF(blob, act.adjunto_nombre);
                                                    }}
                                                    className="mt-2 text-xs text-blue-600 flex items-center gap-1 hover:underline"
                                                >
                                                    <Download size={14} /> {act.adjunto_nombre}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {actuaciones.length === 0 && (
                                        <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-400 italic text-sm">
                                            No se han registrado acciones para este trámite.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showActionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={20} className="text-blue-600" />
                                Registrar Acción - {selectedPqr?.radicado}
                            </h3>
                            <button onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleActionSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Tipo de Actuación</label>
                                <select
                                    name="tipo_actuacion"
                                    value={actionData.tipo_actuacion}
                                    onChange={(e) => setActionData({ ...actionData, tipo_actuacion: e.target.value })}
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                >
                                    <option>Seguimiento</option>
                                    <option>Requerimiento</option>
                                    <option>Auto de Trámite</option>
                                    <option>Respuesta</option>
                                    <option>Cierre</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Observaciones / Descripción del Evento</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={actionData.observacion}
                                    onChange={(e) => setActionData({ ...actionData, observacion: e.target.value })}
                                    placeholder="Describa la acción realizada..."
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 ring-blue-500 text-sm"
                                ></textarea>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Adjuntar PDF (Opcional)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            if (e.target.files[0].type !== 'application/pdf') {
                                                alert('Solo se permiten archivos PDF');
                                                e.target.value = '';
                                                return;
                                            }
                                            setActionAttachment(e.target.files[0]);
                                        }
                                    }}
                                    className="w-full text-xs"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowActionModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? 'Guardando...' : 'Guardar Evento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Edición */}
            {showEditModal && editData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Editar Registro: {editData.radicado}</h3>
                                <p className="text-sm text-slate-500">Actualice la información de la PQR y el solicitante.</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sección Solicitante */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-blue-600 border-b pb-2 uppercase text-xs tracking-wider">Información del Solicitante</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Nombre Completo</label>
                                            <input
                                                type="text"
                                                value={editData.solicitante?.nombre_completo || editData.nombre_completo}
                                                onChange={(e) => setEditData({ ...editData, solicitante: { ...editData.solicitante, nombre_completo: e.target.value } })}
                                                className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Número de Identificación</label>
                                            <input
                                                type="text"
                                                value={editData.solicitante?.numero_identificacion || editData.numero_identificacion}
                                                onChange={(e) => setEditData({ ...editData, solicitante: { ...editData.solicitante, numero_identificacion: e.target.value } })}
                                                className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500">Email</label>
                                                <input
                                                    type="email"
                                                    value={editData.solicitante?.email || editData.email || ''}
                                                    onChange={(e) => setEditData({ ...editData, solicitante: { ...editData.solicitante, email: e.target.value } })}
                                                    className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500">Teléfono</label>
                                                <input
                                                    type="text"
                                                    value={editData.solicitante?.telefono || editData.telefono || ''}
                                                    onChange={(e) => setEditData({ ...editData, solicitante: { ...editData.solicitante, telefono: e.target.value } })}
                                                    className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Dirección</label>
                                            <input
                                                type="text"
                                                value={editData.solicitante?.direccion || editData.direccion || ''}
                                                onChange={(e) => setEditData({ ...editData, solicitante: { ...editData.solicitante, direccion: e.target.value } })}
                                                className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección PQR */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-orange-600 border-b pb-2 uppercase text-xs tracking-wider">Detalles de la PQR</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500">Tipo de PQR</label>
                                                <select
                                                    value={editData.tipo_pqr}
                                                    onChange={(e) => setEditData({ ...editData, tipo_pqr: e.target.value })}
                                                    className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                                >
                                                    <option>Petición</option>
                                                    <option>Queja</option>
                                                    <option>Reclamo</option>
                                                    <option>Sugerencia</option>
                                                    <option>Denuncia</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500">Canal de Recepción</label>
                                                <select
                                                    value={editData.canal_recepcion}
                                                    onChange={(e) => setEditData({ ...editData, canal_recepcion: e.target.value })}
                                                    className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                                >
                                                    <option>Presencial</option>
                                                    <option>Virtual</option>
                                                    <option>Telefónico</option>
                                                    <option>Correspondencia</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Fecha de Vencimiento</label>
                                            <input
                                                type="date"
                                                value={editData.fecha_vencimiento}
                                                onChange={(e) => setEditData({ ...editData, fecha_vencimiento: e.target.value })}
                                                className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">Asunto</label>
                                            <textarea
                                                rows={4}
                                                value={editData.asunto}
                                                onChange={(e) => setEditData({ ...editData, asunto: e.target.value })}
                                                className="w-full p-2 border rounded-lg mt-1 outline-none focus:ring-2 ring-blue-500 text-sm"
                                                required
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 pt-6 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
