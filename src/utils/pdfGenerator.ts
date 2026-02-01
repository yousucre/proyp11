import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SystemConfig } from '../db/types';
import { configApi } from '../api/config';
import { bufferToBlob } from './fileUtils';

const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const addHeader = async (doc: jsPDF, config: SystemConfig | undefined) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Print Date (Top Right)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const printDate = `Fecha de impresión: ${new Date().toLocaleString()}`;
    doc.text(printDate, pageWidth - 14, 10, { align: 'right' });

    if (config?.entidad_logo) {
        try {
            const logoBlob = bufferToBlob(config.entidad_logo, 'image/png');
            if (logoBlob) {
                const imageData = await blobToDataURL(logoBlob);
                // Logo at top left
                doc.addImage(imageData, 'PNG', 14, 10, 25, 25);
            }
        } catch (err) {
            console.error('Error adding logo to PDF:', err);
        }
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const entityName = config?.entidad_nombre || 'PERSONERÍA MUNICIPAL';
    // Centered title, but avoiding the logo area if possible or just centered
    doc.text(entityName.toUpperCase(), pageWidth / 2, 25, { align: 'center' });

    currentY = 40;
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);

    return currentY + 10;
};

const addFooter = (doc: jsPDF, config: SystemConfig | undefined) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

    const email = config?.entidad_email ? `Email: ${config.entidad_email}` : '';
    const tel = config?.entidad_telefono ? `Tel: ${config.entidad_telefono}` : '';
    const ws = config?.entidad_whatsapp ? `WhatsApp: ${config.entidad_whatsapp}` : '';
    const nit = config?.entidad_nit ? `NIT: ${config.entidad_nit}` : '';

    const footerText = [nit, email, tel, ws].filter(t => t !== '').join(' | ');
    doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: 'center' });

    // Page number
    const pageCount = doc.getNumberOfPages();
    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.text(`Página ${pageNumber} de ${pageCount}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
};

const addSignatureSpace = (doc: jsPDF, lastY: number, config: SystemConfig | undefined) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Check if there is enough space, otherwise add page
    let sigY = lastY + 30;
    if (sigY > pageHeight - 50) {
        doc.addPage();
        sigY = 50;
        addFooter(doc, config);
    }

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(pageWidth / 2 - 40, sigY, pageWidth / 2 + 40, sigY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA DEL FUNCIONARIO', pageWidth / 2, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Responsable del Trámite', pageWidth / 2, sigY + 10, { align: 'center' });
};

export const generatePQRVoucher = async (pqr: any): Promise<Blob> => {
    const doc = new jsPDF();
    const config = await configApi.getSystemConfig();
    const pageWidth = doc.internal.pageSize.getWidth();

    const startY = await addHeader(doc, config);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE RADICACIÓN PQR', pageWidth / 2, startY, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Radicado: ${pqr.radicado}`, 14, startY + 15);
    doc.text(`Fecha Radicación: ${new Date(pqr.fecha_radicacion).toLocaleString()}`, 14, startY + 23);

    const tableData = [
        ['Tipo de PQR', pqr.tipo_pqr],
        ['Estado', pqr.estado],
        ['Canal de Recepción', pqr.canal_recepcion || 'N/A'],
        ['Asunto', pqr.asunto],
        ['Solicitante', pqr.solicitante?.nombre_completo || pqr.nombre_completo],
        ['Identificación', pqr.solicitante?.numero_identificacion || pqr.numero_identificacion],
        ['Email Solicitante', pqr.solicitante?.email || pqr.email || 'N/A'],
        ['Teléfono', pqr.solicitante?.telefono || pqr.telefono || 'N/A'],
        ['Dirección', pqr.solicitante?.direccion || pqr.direccion || 'N/A'],
        ['Fecha Vencimiento', pqr.fecha_vencimiento ? new Date(pqr.fecha_vencimiento).toLocaleDateString() : 'N/A'],
    ];

    autoTable(doc, {
        startY: startY + 30,
        head: [['Campo', 'Información']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        didDrawPage: () => addFooter(doc, config)
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    addSignatureSpace(doc, finalY, config);
    addFooter(doc, config); // Ensure footer on last page too

    return doc.output('blob');
};

export const generateReportPDF = async (title: string, data: any[], columns: string[]): Promise<void> => {
    const doc = new jsPDF();
    const config = await configApi.getSystemConfig();
    const pageWidth = doc.internal.pageSize.getWidth();

    const startY = await addHeader(doc, config);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), pageWidth / 2, startY, { align: 'center' });

    autoTable(doc, {
        startY: startY + 10,
        head: [columns],
        body: data.map(obj => columns.map(col => obj[col] || '')),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        didDrawPage: () => addFooter(doc, config)
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    addSignatureSpace(doc, finalY, config);
    addFooter(doc, config);

    doc.save(`${title.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateBitacoraPDF = async (pqr: any, actuaciones: any[]): Promise<void> => {
    const doc = new jsPDF();
    const config = await configApi.getSystemConfig();
    const pageWidth = doc.internal.pageSize.getWidth();

    const startY = await addHeader(doc, config);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIAL DE ACTUACIONES (BITÁCORA)', pageWidth / 2, startY, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Radicado: ${pqr.radicado}`, 14, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Solicitante: ${pqr.solicitante?.nombre_completo || pqr.nombre_completo}`, 14, startY + 18);
    doc.text(`Asunto: ${pqr.asunto}`, 14, startY + 24);
    doc.text(`Fecha Radicación: ${new Date(pqr.fecha_radicacion).toLocaleDateString()}`, 14, startY + 30);

    const tableData = actuaciones.map(act => [
        new Date(act.fecha_actuacion).toLocaleString(),
        act.tipo_actuacion,
        act.observacion,
        act.usuario || 'N/A'
    ]);

    autoTable(doc, {
        startY: startY + 40,
        head: [['Fecha / Hora', 'Tipo', 'Observación/Actuación', 'Usuario']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: {
            2: { cellWidth: 80 }
        },
        didDrawPage: () => addFooter(doc, config)
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    addSignatureSpace(doc, finalY, config);
    addFooter(doc, config);

    doc.save(`bitacora_${pqr.radicado}.pdf`);
};
