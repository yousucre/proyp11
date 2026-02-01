import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getTiposActividad = async (req: AuthRequest, res: Response) => {
    try {
        const types = await prisma.tipoActividad.findMany();
        res.json(types);
    } catch (e) {
        res.status(500).json({ error: 'Error fetching tipos actividad' });
    }
};

export const createTipoActividad = async (req: AuthRequest, res: Response) => {
    const { nombre } = req.body;
    try {
        const type = await prisma.tipoActividad.create({ data: { nombre } });
        res.json(type);
    } catch (e) {
        res.status(500).json({ error: 'Error creating tipo actividad' });
    }
};

export const updateTipoActividad = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { nombre } = req.body;
    try {
        await prisma.tipoActividad.update({
            where: { id: Number(id) },
            data: { nombre }
        });
        res.json({ message: 'Updated' });
    } catch (e) {
        res.status(500).json({ error: 'Error updating tipo actividad' });
    }
};

export const deleteTipoActividad = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.tipoActividad.delete({ where: { id: Number(id) } });
        res.json({ message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ error: 'Error deleting tipo actividad' });
    }
};

export const getTiposExpediente = async (req: AuthRequest, res: Response) => {
    try {
        const types = await prisma.tipoExpediente.findMany();
        res.json(types);
    } catch (e) {
        res.status(500).json({ error: 'Error fetching tipos expediente' });
    }
};

export const getConfig = async (req: Request, res: Response) => {
    try {
        const config = await prisma.systemConfig.findFirst();
        if (config) {
            const { hashed_password, ...safeConfig } = config;
            res.json(safeConfig);
        } else {
            res.status(404).json({ error: 'Config not found' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Error fetching config' });
    }
};

export const updateSystemConfig = async (req: AuthRequest, res: Response) => {
    const data = req.body;
    try {
        let logoBuffer = undefined;
        if (data.entidad_logo && data.entidad_logo.data) {
            logoBuffer = Buffer.from(data.entidad_logo.data);
        } else if (typeof data.entidad_logo === 'string' && data.entidad_logo.includes('base64,')) {
            const base64Data = data.entidad_logo.split('base64,')[1];
            logoBuffer = Buffer.from(base64Data, 'base64');
        } else if (typeof data.entidad_logo === 'string') {
            logoBuffer = Buffer.from(data.entidad_logo, 'base64');
        }

        const config = await prisma.systemConfig.findFirst();
        if (!config) return res.status(404).json({ error: 'Config not found' });

        const updateData: any = {
            entidad_nombre: data.entidad_nombre,
            plazo_peticion: data.plazo_peticion,
            plazo_queja: data.plazo_queja,
            plazo_reclamo: data.plazo_reclamo,
            plazo_recurso: data.plazo_recurso,
            prefijo_radicado: data.prefijo_radicado,
            backup_automatico: data.backup_automatico,
            backup_frecuencia: data.backup_frecuencia,
            entidad_email: data.entidad_email,
            entidad_telefono: data.entidad_telefono,
            entidad_whatsapp: data.entidad_whatsapp,
            entidad_nit: data.entidad_nit,
        };

        if (logoBuffer !== undefined) {
            updateData.entidad_logo = logoBuffer;
        } else if (data.entidad_logo === null) {
            updateData.entidad_logo = null;
        }

        await prisma.systemConfig.update({
            where: { id: config.id },
            data: updateData
        });

        res.json({ message: 'Config updated' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error updating config' });
    }
};
