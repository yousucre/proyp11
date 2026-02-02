import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        const [totalPqr, totalExpedientes, pqrs] = await Promise.all([
            prisma.pQR.count(),
            prisma.expediente.count(),
            prisma.pQR.findMany({ select: { estado: true } })
        ]);

        const statusCounts = new Map<string, number>();
        pqrs.forEach(p => {
            statusCounts.set(p.estado, (statusCounts.get(p.estado) || 0) + 1);
        });

        res.json({
            total: totalPqr,
            expedientes: totalExpedientes,
            byStatus: Array.from(statusCounts.entries()).map(([estado, count]) => ({ estado, count }))
        });
    } catch (e) {
        res.status(500).json({ error: 'Error fetching stats' });
    }
};

export const getPendingPQRs = async (req: AuthRequest, res: Response) => {
    try {
        const pending = await prisma.pQR.findMany({
            where: {
                estado: 'En Trámite',
                fecha_vencimiento: { not: null }
            },
            orderBy: { fecha_vencimiento: 'asc' },
            take: 10
        });
        res.json(pending);
    } catch (e) {
        res.status(500).json({ error: 'Error fetching pending PQRs' });
    }
};

export const getQuickNotes = async (req: AuthRequest, res: Response) => {
    try {
        const notes = await prisma.quickNote.findMany({
            orderBy: { posicion: 'asc' }
        });
        res.json(notes);
    } catch (e) {
        res.status(500).json({ error: 'Error fetching notes' });
    }
};

export const addQuickNote = async (req: AuthRequest, res: Response) => {
    const { texto } = req.body;
    try {
        const count = await prisma.quickNote.count();
        const note = await prisma.quickNote.create({
            data: { texto, posicion: count }
        });
        res.json(note);
    } catch (e) {
        res.status(500).json({ error: 'Error adding note' });
    }
};

export const updateQuickNote = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { texto } = req.body;
    try {
        await prisma.quickNote.update({
            where: { id: Number(id) },
            data: { texto }
        });
        res.json({ message: 'Updated' });
    } catch (e) {
        res.status(500).json({ error: 'Error updating note' });
    }
};

export const deleteQuickNote = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.quickNote.delete({ where: { id: Number(id) } });
        res.json({ message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ error: 'Error deleting note' });
    }
};

export const updateNotesOrder = async (req: AuthRequest, res: Response) => {
    const { notes } = req.body; // Array of {id, posicion}
    try {
        await prisma.$transaction(
            notes.map((n: any) => prisma.quickNote.update({
                where: { id: n.id },
                data: { posicion: n.posicion }
            }))
        );
        res.json({ message: 'Order updated' });
    } catch (e) {
        res.status(500).json({ error: 'Error updating order' });
    }
};
