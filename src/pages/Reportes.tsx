import { useState, useEffect, useRef } from 'react';
import { Download, Filter, FileText, BarChart2, PieChart as PieIcon, ChevronDown, CheckSquare, Square, X } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { pqrApi } from '../api/pqr';
import { reportApi } from '../api/reports';
import { configApi } from '../api/config';
import type { ReportData, ReportFilters, TipoActividad } from '../db/types';
import { stringToColor, exportToCSV } from '../utils/formatters';
import { generateReportPDF } from '../utils/pdfGenerator';

type TabType = 'pqr' | 'otras' | 'general';

export default function Reportes() {
    const [activeTab, setActiveTab] = useState<TabType>('pqr');
    const [filters, setFilters] = useState<ReportFilters>({
        fecha_inicio: '',
        fecha_fin: '',
        tipo_pqr: '',
        estado: '',
        canal_recepcion: ''
    });

    const [otrasFilters, setOtrasFilters] = useState({
        fecha_inicio: '',
        fecha_fin: '',
        actividad: ''
    });

    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [otrasReportData, setOtrasReportData] = useState<any[]>([]);
    const [generalReportData, setGeneralReportData] = useState<{ pqrs: any[], otras: any[] } | null>(null);
    const [pqrChartData, setPqrChartData] = useState<any[]>([]);
    const [otrasChartData, setOtrasChartData] = useState<any[]>([]);

    const [pqrGroupBy, setPqrGroupBy] = useState<'tipo' | 'month' | 'year'>('tipo');
    const [otrasGroupBy, setOtrasGroupBy] = useState<'actividad' | 'month' | 'year'>('actividad');
    const [tiposActividad, setTiposActividad] = useState<TipoActividad[]>([]);
    const [selectedActividades, setSelectedActividades] = useState<string[]>([]);
    const [showActividadSelector, setShowActividadSelector] = useState(false);
    const [loading, setLoading] = useState(false);

    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadTiposActividad();
        loadReport();
    }, [activeTab]);

    const loadTiposActividad = async () => {
        try {
            const tipos = await configApi.getTiposActividad();
            setTiposActividad(tipos);
        } catch (err) {
            console.error('Error loading tipos:', err);
        }
    };

    const loadReport = async () => {
        setLoading(true);
        try {
            if (activeTab === 'pqr') {
                const stats = await reportApi.getStats(filters);
                const chart = await reportApi.getByPeriod({ ...filters, groupBy: pqrGroupBy });
                setReportData(stats);
                setPqrChartData(chart);
            } else if (activeTab === 'otras') {
                const data = await reportApi.getOtras({ ...otrasFilters, actividades: selectedActividades });
                const chart = await reportApi.getOtrasByPeriod({ ...otrasFilters, actividades: selectedActividades, groupBy: otrasGroupBy });
                setOtrasReportData(data);
                setOtrasChartData(chart);
            } else if (activeTab === 'general') {
                const data = await reportApi.getGeneral();
                setGeneralReportData(data);
            }
        } catch (err) {
            console.error('Error loading report:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleOtrasFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setOtrasFilters({ ...otrasFilters, [e.target.name]: e.target.value });
    };

    const handleExport = async () => {
        try {
            if (activeTab === 'pqr') {
                const pqrs = await pqrApi.getAll(filters);
                const flattened = pqrs.map((p: any) => ({
                    ...p,
                    nombre_completo: p.solicitante?.nombre_completo,
                    numero_identificacion: p.solicitante?.numero_identificacion,
                    solicitante: undefined // Remove nested object for CSV
                }));
                exportToCSV(flattened, `reporte_pqr_${new Date().toISOString().split('T')[0]}.csv`);
            } else if (activeTab === 'otras') {
                exportToCSV(otrasReportData, `reporte_otras_gestiones_${new Date().toISOString().split('T')[0]}.csv`);
            }
        } catch (err) {
            console.error('Error exporting:', err);
        }
    };


    const handleExportPDF = async () => {
        setLoading(true);
        try {
            if (activeTab === 'pqr' && reportData) {
                const pqrs = await pqrApi.getAll(filters);
                const flattened = pqrs.map((p: any) => ({
                    ...p,
                    nombre_completo: p.solicitante?.nombre_completo,
                    numero_identificacion: p.solicitante?.numero_identificacion
                }));
                const columns = ['radicado', 'fecha_radicacion', 'nombre_completo', 'tipo_pqr', 'estado', 'asunto'];
                await generateReportPDF('Reporte de PQRS', flattened, columns);
            } else if (activeTab === 'otras') {
                const columns = ['actividad', 'entidad', 'count'];
                await generateReportPDF('Reporte de Otras Gestiones', otrasReportData, columns);
            }
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error al generar el PDF');
        } finally {
            setLoading(false);
        }
    };


    const toggleActividad = (nombre: string) => {
        setSelectedActividades(prev =>
            prev.includes(nombre)
                ? prev.filter(a => a !== nombre)
                : [...prev, nombre]
        );
    };

    const handlePeriodChange = (type: 'pqr' | 'otras', month: string, year: string) => {
        if (!month || !year) return;
        const start = `${year}-${month.padStart(2, '0')}-01`;
        const endDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const end = `${year}-${month.padStart(2, '0')}-${endDay}`;

        if (type === 'pqr') {
            setFilters({ ...filters, fecha_inicio: start, fecha_fin: end });
        } else {
            setOtrasFilters({ ...otrasFilters, fecha_inicio: start, fecha_fin: end });
        }
    };

    const renderFiltersSection = () => {
        if (activeTab === 'general') return null;

        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-slate-600" />
                        <h3 className="font-semibold text-slate-800">Filtros de Búsqueda</h3>
                    </div>
                    {activeTab === 'otras' && (
                        <div className="relative">
                            <button
                                onClick={() => setShowActividadSelector(!showActividadSelector)}
                                className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100"
                            >
                                <CheckSquare size={16} />
                                Actividades ({selectedActividades.length || 'Todas'})
                                <ChevronDown size={14} />
                            </button>

                            {showActividadSelector && (
                                <div className="absolute right-0 mt-2 w-64 bg-white border rounded-xl shadow-xl z-50 p-2 max-h-64 overflow-y-auto">
                                    <div className="flex justify-between items-center p-2 border-b mb-2">
                                        <span className="text-xs font-bold text-slate-500">Seleccionar Actividades</span>
                                        <button onClick={() => setShowActividadSelector(false)} className="text-slate-400 hover:text-slate-600">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    {tiposActividad.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => toggleActividad(t.nombre)}
                                            className="flex items-center gap-2 w-full p-2 hover:bg-slate-50 rounded-lg text-sm transition-colors text-left"
                                        >
                                            {selectedActividades.includes(t.nombre) ? (
                                                <CheckSquare size={16} className="text-blue-600" />
                                            ) : (
                                                <Square size={16} className="text-slate-400" />
                                            )}
                                            <span className={selectedActividades.includes(t.nombre) ? 'text-blue-700 font-medium' : 'text-slate-600'}>
                                                {t.nombre}
                                            </span>
                                        </button>
                                    ))}
                                    {selectedActividades.length > 0 && (
                                        <button
                                            onClick={() => setSelectedActividades([])}
                                            className="w-full mt-2 pt-2 border-t text-xs text-center text-red-500 hover:font-bold"
                                        >
                                            Limpiar Selección
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {/* Periodo Mes/Año */}
                    <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mes</label>
                            <select
                                className="w-full p-2 border rounded-lg text-sm"
                                onChange={(e) => handlePeriodChange(activeTab, e.target.value, (new Date()).getFullYear().toString())}
                            >
                                <option value="">Seleccione Mes</option>
                                <option value="1">Enero</option>
                                <option value="2">Febrero</option>
                                <option value="3">Marzo</option>
                                <option value="4">Abril</option>
                                <option value="5">Mayo</option>
                                <option value="6">Junio</option>
                                <option value="7">Julio</option>
                                <option value="8">Agosto</option>
                                <option value="9">Septiembre</option>
                                <option value="10">Octubre</option>
                                <option value="11">Noviembre</option>
                                <option value="12">Diciembre</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Año</label>
                            <select
                                className="w-full p-2 border rounded-lg text-sm"
                                onChange={(e) => handlePeriodChange(activeTab, '1', e.target.value)}
                            >
                                <option value="">Seleccione Año</option>
                                {Array.from({ length: 5 }, (_, i) => (new Date()).getFullYear() - i).map(y => (
                                    <option key={y} value={y.toString()}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Rango de Fechas */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Desde</label>
                        <input
                            type="date"
                            name="fecha_inicio"
                            value={activeTab === 'pqr' ? filters.fecha_inicio : otrasFilters.fecha_inicio}
                            onChange={activeTab === 'pqr' ? handleFilterChange : handleOtrasFilterChange}
                            className="w-full p-2 border rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Hasta</label>
                        <input
                            type="date"
                            name="fecha_fin"
                            value={activeTab === 'pqr' ? filters.fecha_fin : otrasFilters.fecha_fin}
                            onChange={activeTab === 'pqr' ? handleFilterChange : handleOtrasFilterChange}
                            className="w-full p-2 border rounded-lg text-sm"
                        />
                    </div>

                    {activeTab === 'pqr' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                            <select
                                name="tipo_pqr"
                                value={filters.tipo_pqr}
                                onChange={handleFilterChange}
                                className="w-full p-2 border rounded-lg text-sm"
                            >
                                <option value="">Todos</option>
                                <option>Petición</option>
                                <option>Queja</option>
                                <option>Reclamo</option>
                                <option>Recurso</option>
                                <option>Solicitud de Información</option>
                            </select>
                        </div>
                    )}

                    <div className="flex items-end">
                        <button
                            onClick={loadReport}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-bold transition-colors h-[38px] flex items-center justify-center gap-2"
                        >
                            <BarChart2 size={16} /> ACTUALIZAR
                        </button>
                    </div>
                </div>

                {/* Agrupar por */}
                <div className="mt-4 pt-4 border-t flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-400 uppercase">Agrupar por:</span>
                    <div className="flex gap-2">
                        {activeTab === 'pqr' ? (
                            <>
                                <button
                                    onClick={() => setPqrGroupBy('tipo')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${pqrGroupBy === 'tipo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Tipo
                                </button>
                                <button
                                    onClick={() => setPqrGroupBy('month')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${pqrGroupBy === 'month' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Mes
                                </button>
                                <button
                                    onClick={() => setPqrGroupBy('year')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${pqrGroupBy === 'year' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Año
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setOtrasGroupBy('actividad')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${otrasGroupBy === 'actividad' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Actividad
                                </button>
                                <button
                                    onClick={() => setOtrasGroupBy('month')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${otrasGroupBy === 'month' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Mes
                                </button>
                                <button
                                    onClick={() => setOtrasGroupBy('year')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${otrasGroupBy === 'year' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Año
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderPQRReport = () => (
        <div ref={reportRef} className="space-y-6 bg-slate-50 p-4 rounded-xl">
            {reportData && (
                <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                            <p className="text-sm font-medium text-slate-500">Total PQRS</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">{reportData.totalPQR}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
                            <p className="text-sm font-medium text-slate-500">PQR Vencidas</p>
                            <p className="text-3xl font-bold text-red-600 mt-2">{reportData.vencidas}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100">
                            <p className="text-sm font-medium text-slate-500">Tipos de PQR</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">{reportData.porTipo.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
                            <p className="text-sm font-medium text-slate-500">Canales</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{reportData.porCanal.length}</p>
                        </div>
                    </div>

                    {/* Tabla Resumen PQR */}
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="p-4 border-b bg-slate-50">
                            <h3 className="font-bold text-slate-800">Resumen Cantidad por Tipo</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo de PQR</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {reportData.porTipo.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-800">{item.tipo}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                {item.count}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td className="px-6 py-4">TOTAL GENERAL</td>
                                    <td className="px-6 py-4 text-center text-blue-700">{reportData.totalPQR}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="font-semibold text-slate-800 mb-4 flex justify-between">
                                Distribución Volumétrica
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    Por {pqrGroupBy === 'tipo' ? 'Tipo' : pqrGroupBy === 'month' ? 'Mes' : 'Año'}
                                </span>
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={pqrChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" fontSize={11} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="font-semibold text-slate-800 mb-4">Estado de las Solicitudes</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={reportData.porEstado}
                                        dataKey="count"
                                        nameKey="estado"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {reportData.porEstado.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={stringToColor(entry.estado)} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderOtrasReport = () => (
        <div ref={reportRef} className="space-y-6 bg-slate-50 p-4 rounded-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="font-semibold text-slate-800 mb-4 flex justify-between">
                        Distribución de Actividades
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                            Por {otrasGroupBy === 'actividad' ? 'Actividad' : otrasGroupBy === 'month' ? 'Mes' : 'Año'}
                        </span>
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        {otrasGroupBy === 'month' || otrasGroupBy === 'year' ? (
                            <LineChart data={otrasChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" fontSize={11} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        ) : (
                            <BarChart data={otrasChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" fontSize={11} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b bg-slate-50">
                        <h3 className="font-bold text-slate-800">Resumen de Actividades</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actividad / Periodo</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y relative max-h-[300px] overflow-y-auto">
                            {otrasChartData.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{item.label}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                                            {item.count}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {otrasChartData.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-10 text-center text-slate-400 italic">No hay datos para mostrar</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Detalle Consolidado (Actividad | Entidad | Cantidad)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actividad</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Entidad</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {otrasReportData.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{item.actividad}</td>
                                    <td className="px-6 py-4 text-slate-600">{item.entidad}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold">
                                            {item.count}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {otrasReportData.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">Aplique filtros para visualizar resultados</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderGeneralReport = () => (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between mb-6 pb-2 border-b">
                    <div className="flex items-center gap-2">
                        <FileText className="text-blue-600" size={24} />
                        <h3 className="text-xl font-bold text-slate-800">Informe Consolidado</h3>
                    </div>
                    <button onClick={loadReport} className="text-sm text-blue-600 font-bold hover:underline">Actualizar Datos</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* PQRS General */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gestión de PQRS (Por Tipo)</h4>
                        <div className="space-y-2">
                            {generalReportData?.pqrs.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="font-medium text-slate-700">{item.tipo}</span>
                                    <span className="text-xl font-bold text-blue-600">{item.count}</span>
                                </div>
                            ))}
                            {generalReportData?.pqrs.length === 0 && !loading && (
                                <p className="text-center text-slate-500 py-4">No hay datos de PQRS.</p>
                            )}
                        </div>
                    </div>

                    {/* Otras Gestiones General */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Otras Gestiones (Por Actividad)</h4>
                        <div className="space-y-2">
                            {generalReportData?.otras.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                                    <span className="font-medium text-slate-700">{item.actividad}</span>
                                    <span className="text-xl font-bold text-purple-600">{item.count}</span>
                                </div>
                            ))}
                            {generalReportData?.otras.length === 0 && !loading && (
                                <p className="text-center text-slate-500 py-4">No hay datos de actividades.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-600 p-8 rounded-2xl text-white shadow-xl shadow-blue-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                        <BarChart2 size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold">Resumen Estadístico</h3>
                        <p className="text-blue-100 opacity-80">Consolidado total de gestiones realizadas en el sistema.</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
                    <div>
                        <p className="text-blue-100 text-sm font-medium">Total PQRS</p>
                        <p className="text-4xl font-bold mt-1">
                            {generalReportData?.pqrs.reduce((acc, curr) => acc + curr.count, 0) || 0}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-100 text-sm font-medium">Otras Gestiones</p>
                        <p className="text-4xl font-bold mt-1">
                            {generalReportData?.otras.reduce((acc, curr) => acc + curr.count, 0) || 0}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reportes y Estadísticas</h2>
                    <p className="text-slate-600">
                        {activeTab === 'pqr' ? 'Análisis detallado de PQR' :
                            activeTab === 'otras' ? 'Control de actividades en Otras Gestiones' :
                                'Consolidado general de información'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {activeTab !== 'general' && (
                        <>
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Download size={18} />
                                Exportar PDF
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <FileText size={18} />
                                Exportar CSV
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Selector de Pestañas */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('pqr')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'pqr'
                        ? 'bg-white text-blue-600 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    <BarChart2 size={18} />
                    Estadísticas PQR
                </button>
                <button
                    onClick={() => setActiveTab('otras')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'otras'
                        ? 'bg-white text-blue-600 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    <PieIcon size={18} />
                    Informe Otras Gestiones
                </button>
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'general'
                        ? 'bg-white text-blue-600 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    <FileText size={18} />
                    Informe General
                </button>
            </div>

            {loading ? (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 animate-pulse">
                    Procesando información del sistema...
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    {renderFiltersSection()}
                    {activeTab === 'pqr' && renderPQRReport()}
                    {activeTab === 'otras' && renderOtrasReport()}
                    {activeTab === 'general' && renderGeneralReport()}
                </div>
            )}
        </div>
    );
}
