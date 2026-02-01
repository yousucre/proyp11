import { useState } from 'react';
import { Save, AlertCircle, FileDown } from 'lucide-react';
import { pqrApi } from '../api/pqr';
import { fileToBase64 } from '../utils/fileUtils';
import { generatePQRVoucher } from '../utils/pdfGenerator';

export default function Radicacion() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [radicadoId, setRadicadoId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        tipo_identificacion: 'CC',
        numero_identificacion: '',
        nombre_completo: '',
        email: '',
        telefono: '',
        direccion: '',
        tipo_pqr: 'Petición',
        asunto: '',
        fecha_vencimiento: '',
        canal_recepcion: 'Presencial',
        manual_radicado: ''
    });
    const [attachment, setAttachment] = useState<File | null>(null);

    const initialFormState = {
        tipo_identificacion: 'CC',
        numero_identificacion: '',
        nombre_completo: '',
        email: '',
        telefono: '',
        direccion: '',
        tipo_pqr: 'Petición',
        asunto: '',
        fecha_vencimiento: '',
        canal_recepcion: 'Presencial',
        manual_radicado: ''
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(null);
        setRadicadoId(null);

        try {
            let adjuntoBase64 = undefined;
            if (attachment) {
                adjuntoBase64 = await fileToBase64(attachment);
            }

            const pqrData = {
                ...formData,
                adjunto_pdf: adjuntoBase64,
                adjunto_nombre: attachment?.name || undefined
            };

            const result = await pqrApi.create(pqrData);
            setRadicadoId(result.id);

            // Construct object for voucher
            const pqrWithDetails = {
                ...pqrData,
                id: result.id,
                radicado: result.radicado,
                fecha_radicacion: new Date(),
                estado: 'Registrada',
                fecha_vencimiento: formData.fecha_vencimiento ? new Date(formData.fecha_vencimiento) : undefined
            };

            try {
                const voucherBlob = await generatePQRVoucher(pqrWithDetails as any);
                const voucherBase64 = await fileToBase64(voucherBlob);
                await pqrApi.update(result.id, { comprobante_pdf: voucherBase64 } as any);
            } catch (err) {
                console.error("Error generating/saving voucher:", err);
            }

            setSuccess(`PQR Radicada con éxito: ${result.radicado}`);

            // Reset form
            setFormData(initialFormState);
            setAttachment(null);

            const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error) {
            console.error(error);
            alert('Error al radicar PQR');
        } finally {
            setLoading(false);
        }
    };


    const downloadVoucher = async () => {
        if (!radicadoId) return;
        try {
            const pqr = await pqrApi.getById(radicadoId);
            if (pqr?.comprobante_pdf) {
                // pqr.comprobante_pdf comes as { type: 'Buffer', data: [...] } or base64 string depending on prisma/json
                // Prisma returns Bytes as Base64 string in JSON usually? No, it returns Buffer object in Node.
                // When sent over Express res.json(), Buffer becomes { type: 'Buffer', data: [...] }.
                // We need to handle that.

                let blob: Blob;
                if (pqr.comprobante_pdf.type === 'Buffer') {
                    const bytes = new Uint8Array(pqr.comprobante_pdf.data);
                    blob = new Blob([bytes], { type: 'application/pdf' });
                } else if (typeof pqr.comprobante_pdf === 'string') {
                    // If it somehow comes as string (unlikely default behavior but maybe)
                    const byteCharacters = atob(pqr.comprobante_pdf);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    blob = new Blob([byteArray], { type: 'application/pdf' });
                } else {
                    // unexpected format
                    return;
                }

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comprobante_${pqr!.radicado}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error("Error downloading voucher", e);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Radicación de PQR</h2>
                <p className="text-slate-600">Registro de nuevas solicitudes en el sistema.</p>
            </div>

            {success && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center justify-between border border-green-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={20} />
                        <span className="font-medium">{success}</span>
                    </div>
                    <button
                        onClick={downloadVoucher}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all text-sm font-bold shadow-sm"
                    >
                        <FileDown size={18} />
                        DESCARGAR COMPROBANTE
                    </button>
                </div>
            )}


            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Tipo Identificación</label>
                        <select name="tipo_identificacion" value={formData.tipo_identificacion} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="CC">Cédula de Ciudadanía</option>
                            <option value="NIT">NIT</option>
                            <option value="CE">Cédula de Extranjería</option>
                            <option value="TI">Tarjeta de Identidad</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Número Identificación</label>
                        <input required name="numero_identificacion" value={formData.numero_identificacion} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Nombre Completo / Razón Social</label>
                        <input required name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Teléfono</label>
                        <input name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">Dirección de Residencia</label>
                        <input name="direccion" value={formData.direccion} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>

                <div className="border-t pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Tipo de PQR</label>
                            <select name="tipo_pqr" value={formData.tipo_pqr} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option>Petición</option>
                                <option>Queja</option>
                                <option>Reclamo</option>
                                <option>Recurso</option>
                                <option>Solicitud de Información</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Canal de Recepción</label>
                            <select name="canal_recepcion" value={formData.canal_recepcion} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option>Presencial</option>
                                <option>Correo Electrónico</option>
                                <option>Página Web</option>
                                <option>Telefónico</option>
                                <option>Ventanilla Única</option>
                            </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">Asunto</label>
                            <textarea required rows={3} name="asunto" value={formData.asunto} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Fecha de Vencimiento</label>
                            <input type="date" required name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            <p className="text-xs text-slate-500">Seleccione manualmente la fecha límite.</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Radicado Manual (Opcional)</label>
                            <input name="manual_radicado" placeholder="Dejar vacío para automático" value={formData.manual_radicado} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">Adjuntar Documento (PDF)</label>
                            <input
                                id="pdf-upload"
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="w-full p-2 border border-dashed rounded-lg bg-slate-50 cursor-pointer"
                            />
                            <p className="text-xs text-slate-500">Cargue un archivo PDF si es necesario.</p>
                        </div>

                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button disabled={loading} type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                        <Save size={20} />
                        {loading ? 'Radicando...' : 'Radicar PQR'}
                    </button>
                </div>

            </form>
        </div>
    );
}
