import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getPQRs = async (req: AuthRequest, res: Response) => {
    const filters = req.query as any;
    try {
        const where: any = {};

        if (filters.estado) where.estado = filters.estado;
        if (filters.radicado) {
            where.radicado = { contains: filters.radicado };
        }

        if (filters.fecha_inicio || filters.fecha_fin) {
            where.fecha_radicacion = {};
            if (filters.fecha_inicio) where.fecha_radicacion.gte = new Date(filters.fecha_inicio);
            if (filters.fecha_fin) where.fecha_radicacion.lte = new Date(filters.fecha_fin);
        }

        if (filters.tipo_pqr) where.tipo_pqr = filters.tipo_pqr;

        if (filters.solicitante) {
            where.solicitante = {
                OR: [
                    { nombre_completo: { contains: filters.solicitante } },
                    { numero_identificacion: { contains: filters.solicitante } }
                ]
            };
        }

        const pqrs = await prisma.pQR.findMany({
            where,
            include: { solicitante: true },
            orderBy: { fecha_radicacion: 'desc' }
        });
        res.json(pqrs);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error fetching PQRs' });
    }
};

export const getPQRById = async (req: AuthRequest, res: Response) => {
    try {
        const pqr = await prisma.pQR.findUnique({
            where: { id: Number(req.params.id) },
            include: { solicitante: true, actuaciones: true }
        });
        if (!pqr) return res.status(404).json({ error: 'PQR not found' });
        res.json(pqr);
    } catch (e) {
        res.status(500).json({ error: 'Error fetching PQR' });
    }
};

export const createPQR = async (req: AuthRequest, res: Response) => {
    const data = req.body;
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Find or Create Solicitante
            let solicitante = await tx.solicitante.findFirst({
                where: { numero_identificacion: data.numero_identificacion }
            });

            if (!solicitante) {
                solicitante = await tx.solicitante.create({
                    data: {
                        tipo_identificacion: data.tipo_identificacion,
                        numero_identificacion: data.numero_identificacion,
                        nombre_completo: data.nombre_completo,
                        email: data.email,
                        telefono: data.telefono,
                        direccion: data.direccion
                    }
                });
            }

            // 2. Generate Radicado
            let radicado = data.manual_radicado;
            if (!radicado) {
                const currentYear = new Date().getFullYear();
                const count = await tx.pQR.count({
                    where: {
                        fecha_radicacion: {
                            gte: new Date(`${currentYear}-01-01`),
                            lt: new Date(`${currentYear + 1}-01-01`)
                        }
                    }
                });
                const sequence = (count + 1).toString().padStart(4, '0');
                radicado = `${currentYear}-PQR-${sequence}`;
            }

            // 3. Create PQR
            let adjuntoBuffer = undefined;
            if (data.adjunto_pdf && data.adjunto_pdf.data) {
                adjuntoBuffer = Buffer.from(data.adjunto_pdf.data);
            } else if (typeof data.adjunto_pdf === 'string') {
                adjuntoBuffer = Buffer.from(data.adjunto_pdf, 'base64');
            }

            const pqr = await tx.pQR.create({
                data: {
                    radicado,
                    fecha_radicacion: new Date(),
                    id_solicitante: solicitante.id,
                    tipo_pqr: data.tipo_pqr,
                    asunto: data.asunto,
                    estado: 'Registrada',
                    fecha_vencimiento: data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null,
                    canal_recepcion: data.canal_recepcion,
                    adjunto_pdf: adjuntoBuffer,
                    adjunto_nombre: data.adjunto_nombre
                }
            });

            return pqr;
        });

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating PQR', details: e });
    }
};

export const updatePQR = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { solicitante, ...data } = req.body;
    try {
        /*
         * Handling voucher (comprobante_pdf) update or regular files
         */
        let voucherBuffer = undefined;
        if (data.comprobante_pdf && data.comprobante_pdf.data) {
            voucherBuffer = Buffer.from(data.comprobante_pdf.data);
        } else if (typeof data.comprobante_pdf === 'string') {
            voucherBuffer = Buffer.from(data.comprobante_pdf, 'base64');
        }

        const updateData: any = {
            estado: data.estado,
            asunto: data.asunto,
            tipo_pqr: data.tipo_pqr,
            canal_recepcion: data.canal_recepcion,
            fecha_vencimiento: data.fecha_vencimiento,
        };

        // Only update voucher if provided
        if (voucherBuffer !== undefined) {
            updateData.comprobante_pdf = voucherBuffer;
        }

        // Clean up undefined values
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        await prisma.pQR.update({
            where: { id: Number(id) },
            data: {
                ...updateData,
                solicitante: solicitante ? {
                    update: solicitante
                } : undefined
            }
        });
        res.json({ message: 'PQR updated' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error updating PQR' });
    }
};

export const deletePQR = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.pQR.delete({ where: { id: Number(id) } });
        res.json({ message: 'PQR deleted' });
    } catch (e) {
        res.status(500).json({ error: 'Error deleting PQR' });
    }
};

export const createActuacion = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    try {
        let adjuntoBuffer = undefined;
        if (data.adjunto_pdf && data.adjunto_pdf.data) {
            adjuntoBuffer = Buffer.from(data.adjunto_pdf.data);
        } else if (typeof data.adjunto_pdf === 'string') {
            adjuntoBuffer = Buffer.from(data.adjunto_pdf, 'base64');
        }

        const actuacion = await prisma.actuacion.create({
            data: {
                id_pqr: Number(id),
                fecha_actuacion: new Date(),
                tipo_actuacion: data.tipo_actuacion,
                observacion: data.observacion,
                usuario: data.usuario || 'Sistema',
                adjunto_pdf: adjuntoBuffer,
                adjunto_nombre: data.adjunto_nombre
            }
        });
        res.json(actuacion);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating Actuacion' });
    }
};
