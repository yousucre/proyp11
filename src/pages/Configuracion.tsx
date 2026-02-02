import { useState, useEffect } from 'react';
import { Settings, Save, Database, Clock, Building2, Upload, Trash2, Download } from 'lucide-react';
import { configApi } from '../api/config';
import { bufferToBlob, fileToBase64 } from '../utils/fileUtils';
import { SystemConfig } from '../db/types';

import { useConfig } from '../contexts/ConfigContext';

export default function Configuracion() {
    const { refreshConfig } = useConfig();
    const [config, setConfig] = useState<SystemConfig>({
        plazo_peticion: 15,
        plazo_queja: 15,
        plazo_reclamo: 15,
        plazo_recurso: 30,
        prefijo_radicado: 'PQR',
        backup_automatico: true,
        backup_frecuencia: 7,
        first_setup_done: true,
        entidad_nombre: 'Nombre de la Entidad',
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            console.log('Cargando configuración...');
            const savedConfig = await configApi.getSystemConfig();
            if (savedConfig) {
                console.log('Configuración encontrada:', savedConfig);
                setConfig({
                    ...savedConfig,
                    entidad_nombre: savedConfig.entidad_nombre || 'Nombre de la Entidad'
                });
                if (savedConfig.entidad_logo) {
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    const blob = bufferToBlob(savedConfig.entidad_logo, 'image/png');
                    if (blob) setLogoPreview(URL.createObjectURL(blob));
                }
            }
        } catch (err) {
            console.error('Error al cargar configuración:', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setSuccess(false);

        try {
            console.log('Guardando configuración...', config);

            let logoBase64: any = config.entidad_logo;
            if (config.entidad_logo instanceof File || config.entidad_logo instanceof Blob) {
                logoBase64 = await fileToBase64(config.entidad_logo as any);
            }

            await configApi.updateSystemConfig({
                ...config,
                entidad_logo: logoBase64
            } as any);

            setSuccess(true);
            await refreshConfig(); // Refresh global config
            setTimeout(() => setSuccess(false), 3000);
            await loadConfig(); // Reload to refresh everything
        } catch (err) {
            console.error('Error al guardar configuración:', err);
            alert('Error al guardar configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked :
                type === 'number' ? (parseInt(value) || 0) : value
        }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                alert('Por favor seleccione una imagen');
                return;
            }

            if (logoPreview) URL.revokeObjectURL(logoPreview);
            setLogoPreview(URL.createObjectURL(file));
            setConfig(prev => ({ ...prev, entidad_logo: file }));
        }
    };

    const handleDeleteLogo = () => {
        if (window.confirm('¿Está seguro de eliminar el logo?')) {
            if (logoPreview) URL.revokeObjectURL(logoPreview);
            setLogoPreview(null);
            setConfig(prev => ({ ...prev, entidad_logo: undefined }));
        }
    };

    const handleExportDB = async () => {
        alert('Copia de seguridad del servidor próximamente disponible.');
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h2>
                    <p className="text-slate-600">Gestione la identidad institucional y parámetros generales.</p>
                </div>
            </div>

            {success && (
                <div className="bg-green-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
                    <Save size={20} />
                    <span className="font-bold">¡Configuración guardada exitosamente!</span>
                </div>
            )}

            {/* Identidad de la Entidad */}
            <section className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                <div className="flex items-center gap-2 mb-6 border-b pb-4">
                    <Building2 size={22} className="text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-800">Identidad Institucional</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="space-y-4 flex flex-col items-center lg:items-start">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Logo Actual</label>
                        <div className="relative group w-40 h-40 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-inner">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Building2 className="w-16 h-16 text-slate-200" />
                            )}

                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <label className="p-3 bg-white rounded-full cursor-pointer hover:bg-blue-50 text-blue-600 shadow-xl transition-all hover:scale-110" title="Actualizar Logo">
                                    <Upload size={20} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                                {logoPreview && (
                                    <button
                                        onClick={handleDeleteLogo}
                                        className="p-3 bg-white rounded-full hover:bg-red-50 text-red-600 shadow-xl transition-all hover:scale-110"
                                        title="Eliminar Logo"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center lg:text-left">Dimensiones recomendadas: 300x300px. Formatos: PNG, JPG.</p>
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Nombre de la Entidad</label>
                            <input
                                type="text"
                                name="entidad_nombre"
                                value={config.entidad_nombre || ''}
                                onChange={handleChange}
                                placeholder="Escriba el nombre oficial de la entidad..."
                                className="w-full p-4 border-2 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-xl font-bold text-slate-800"
                            />
                            <p className="text-xs text-slate-400">Este nombre aparecerá en el Dashboard y en todos los reportes PDF generados.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">NIT</label>
                                <input
                                    type="text"
                                    name="entidad_nit"
                                    value={config.entidad_nit || ''}
                                    onChange={handleChange}
                                    className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                                    placeholder="890.000.000-0"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Email Institucional</label>
                                <input
                                    type="email"
                                    name="entidad_email"
                                    value={config.entidad_email || ''}
                                    onChange={handleChange}
                                    className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                                    placeholder="contacto@entidad.gov.co"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Teléfono de Contacto</label>
                                <input
                                    type="text"
                                    name="entidad_telefono"
                                    value={config.entidad_telefono || ''}
                                    onChange={handleChange}
                                    className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                                    placeholder="605 123 4567"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label>
                                <input
                                    type="text"
                                    name="entidad_whatsapp"
                                    value={config.entidad_whatsapp || ''}
                                    onChange={handleChange}
                                    className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                                    placeholder="+57 300 123 4567"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Plazos y Numeración */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4">
                        <Clock size={22} className="text-orange-600" />
                        <h3 className="text-lg font-bold text-slate-800">Plazos de Respuesta</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {['peticion', 'queja', 'reclamo', 'recurso'].map((tipo) => (
                            <div key={tipo} className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">{tipo}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name={`plazo_${tipo}`}
                                        value={(config as any)[`plazo_${tipo}`]}
                                        onChange={handleChange}
                                        className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-200 outline-none font-bold"
                                    />
                                    <span className="absolute right-3 top-3 text-xs text-slate-400">días</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4">
                        <Settings size={22} className="text-purple-600" />
                        <h3 className="text-lg font-bold text-slate-800">Radicación</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Prefijo de Radicado</label>
                            <input
                                type="text"
                                name="prefijo_radicado"
                                value={config.prefijo_radicado}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-200 outline-none font-mono font-bold text-purple-700"
                            />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-500">Ejemplo de formato:</span>
                            <span className="text-sm font-bold text-slate-700">{new Date().getFullYear()}-{config.prefijo_radicado}-0001</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Mantenimiento */}
            <section className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                <div className="flex items-center gap-2 mb-6 border-b pb-4">
                    <Database size={22} className="text-green-600" />
                    <h3 className="text-lg font-bold text-slate-800">Base de Datos y Seguridad</h3>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 flex-1">
                        <input type="checkbox" name="backup_automatico" id="backup_auto" checked={config.backup_automatico} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded cursor-pointer" />
                        <label htmlFor="backup_auto" className="text-sm font-medium text-slate-700 cursor-pointer">Activar recordatorio de copia de seguridad</label>
                    </div>

                    <button onClick={handleExportDB} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-all font-bold shadow-lg">
                        <Download size={20} /> DESCARGAR BACKUP COMPLETO
                    </button>
                </div>
            </section>

            {/* Botón de Acción Principal */}
            <div className="flex justify-center pt-6">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="group relative bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3 shadow-2xl shadow-blue-300 transform active:scale-95 transition-all w-full md:w-auto"
                >
                    <Save size={24} className="group-hover:animate-pulse" />
                    {loading ? 'PROCESANDO...' : 'GUARDAR CONFIGURACIÓN GENERAL'}
                </button>
            </div>
        </div>
    );
}
