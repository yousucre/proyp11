import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getRecords = async (req: AuthRequest, res: Response) => {
    try {
        const { search, startDate, endDate, activity, sortBy, order } = req.query;

        console.log('Fetching OtraGestion records with params:', req.query);

        // Construir condiciones de filtro
        const where: any = {};

        if (search) {
            const searchStr = String(search).toLowerCase();
            where.OR = [
                { cedula: { contains: searchStr, mode: 'insensitive' } },
                { nombres: { contains: searchStr, mode: 'insensitive' } },
                { entidad: { contains: searchStr, mode: 'insensitive' } }
            ];
        }

        if (startDate || endDate) {
            where.fecha = {};
            if (startDate) where.fecha.gte = new Date(String(startDate));
            if (endDate) {
                const end = new Date(String(endDate));
                end.setHours(23, 59, 59, 999); // Incluir todo el día final
                where.fecha.lte = end;
            }
        }

        if (activity) {
            where.actividad = { equals: String(activity) };
        }

        // Construir ordenamiento
        const orderBy: any = {};
        if (sortBy) {
            orderBy[String(sortBy)] = order === 'asc' ? 'asc' : 'desc';
        } else {
            orderBy.fecha = 'desc'; // Default sort
        }

        const records = await prisma.otraGestion.findMany({
            where,
            orderBy
        });

        console.log(`Found ${records.length} records matching criteria`);
        res.json(records);
    } catch (e) {
        console.error('Error fetching records:', e);
        res.status(500).json({ error: 'Error fetching records' });
    }
};

export const createRecord = async (req: AuthRequest, res: Response) => {
    const data = req.body;
    console.log('Creating new OtraGestion record:', data);
    try {
        const record = await prisma.otraGestion.create({
            data: {
                ...data,
                fecha: new Date()
            }
        });
        console.log('Record created successfully:', record.id);
        res.json(record);
    } catch (e) {
        console.error('Error creating record:', e);
        res.status(500).json({ error: 'Error creating record' });
    }
};

export const updateRecord = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await prisma.otraGestion.update({
            where: { id: Number(id) },
            data
        });
        res.json({ message: 'Updated' });
    } catch (e) {
        res.status(500).json({ error: 'Error updating record' });
    }
};

export const deleteRecord = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.otraGestion.delete({ where: { id: Number(id) } });
        res.json({ message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ error: 'Error deleting record' });
    }
};
