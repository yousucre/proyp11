import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getRecords = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Fetching all OtraGestion records...');
        const records = await prisma.otraGestion.findMany({
            orderBy: { fecha: 'desc' }
        });
        console.log(`Found ${records.length} records`);
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
