import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getReportStats = async (req: AuthRequest, res: Response) => {
    const filters = req.query as any;
    try {
        const where: any = {};
        if (filters.fecha_inicio || filters.fecha_fin) {
            where.fecha_radicacion = {};
            if (filters.fecha_inicio) where.fecha_radicacion.gte = new Date(filters.fecha_inicio);
            if (filters.fecha_fin) where.fecha_radicacion.lte = new Date(filters.fecha_fin);
        }
        if (filters.tipo_pqr) where.tipo_pqr = filters.tipo_pqr;
        if (filters.estado) where.estado = filters.estado;

        const pqrs = await prisma.pQR.findMany({ where });
        const totalPQR = pqrs.length;

        const now = new Date();
        const vencidasCount = pqrs.filter(p =>
            p.fecha_vencimiento &&
            new Date(p.fecha_vencimiento) < now &&
            p.estado !== 'Respondida' &&
            p.estado !== 'Cerrada'
        ).length;

        const porTipoMap = new Map();
        const porEstadoMap = new Map();
        const porCanalMap = new Map();

        pqrs.forEach(p => {
            porTipoMap.set(p.tipo_pqr, (porTipoMap.get(p.tipo_pqr) || 0) + 1);
            porEstadoMap.set(p.estado, (porEstadoMap.get(p.estado) || 0) + 1);
            porCanalMap.set(p.canal_recepcion || 'Desconocido', (porCanalMap.get(p.canal_recepcion || 'Desconocido') || 0) + 1);
        });

        res.json({
            totalPQR,
            vencidas: vencidasCount,
            porTipo: Array.from(porTipoMap.entries()).map(([tipo, count]) => ({ tipo, count })),
            porEstado: Array.from(porEstadoMap.entries()).map(([estado, count]) => ({ estado, count })),
            porCanal: Array.from(porCanalMap.entries()).map(([canal, count]) => ({ canal, count }))
        });
    } catch (e) {
        res.status(500).json({ error: 'Error generating report stats' });
    }
};

export const getPQRsByPeriod = async (req: AuthRequest, res: Response) => {
    const filters = req.query as any;
    try {
        const where: any = {};
        if (filters.fecha_inicio || filters.fecha_fin) {
            where.fecha_radicacion = {};
            if (filters.fecha_inicio) where.fecha_radicacion.gte = new Date(filters.fecha_inicio);
            if (filters.fecha_fin) where.fecha_radicacion.lte = new Date(filters.fecha_fin);
        }
        if (filters.tipo_pqr) where.tipo_pqr = filters.tipo_pqr;

        const data = await prisma.pQR.findMany({ where });
        const groups = new Map<string, number>();

        data.forEach(p => {
            let key = '';
            const date = new Date(p.fecha_radicacion);
            if (filters.groupBy === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (filters.groupBy === 'year') {
                key = `${date.getFullYear()}`;
            } else {
                key = p.tipo_pqr;
            }
            groups.set(key, (groups.get(key) || 0) + 1);
        });

        const result = Array.from(groups.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => a.label.localeCompare(b.label));

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'Error grouping PQRs' });
    }
};

export const getGeneralReportData = async (req: AuthRequest, res: Response) => {
    try {
        const [pqrs, otras] = await Promise.all([
            prisma.pQR.findMany(),
            prisma.otraGestion.findMany()
        ]);

        const pqrByType = new Map<string, number>();
        pqrs.forEach(p => {
            pqrByType.set(p.tipo_pqr, (pqrByType.get(p.tipo_pqr) || 0) + 1);
        });

        const otrasByActividad = new Map<string, number>();
        otras.forEach(o => {
            otrasByActividad.set(o.actividad, (otrasByActividad.get(o.actividad) || 0) + 1);
        });

        res.json({
            pqrs: Array.from(pqrByType.entries()).map(([tipo, count]) => ({ tipo, count })),
            otras: Array.from(otrasByActividad.entries()).map(([actividad, count]) => ({ actividad, count }))
        });
    } catch (e) {
        res.status(500).json({ error: 'Error generating general report' });
    }
};

export const getOtrasGestionesReport = async (req: AuthRequest, res: Response) => {
    const filters = req.query as any;
    try {
        const where: any = {};
        if (filters.fecha_inicio || filters.fecha_fin) {
            where.fecha = {};
            if (filters.fecha_inicio) where.fecha.gte = new Date(filters.fecha_inicio);
            if (filters.fecha_fin) where.fecha.lte = new Date(filters.fecha_fin);
        }

        // Handle array of actividades if passed as string separated by comma
        if (filters.actividades) {
            const actList = Array.isArray(filters.actividades) ? filters.actividades : filters.actividades.split(',');
            where.actividad = { in: actList };
        }

        const data = await prisma.otraGestion.findMany({ where });

        const groups = new Map<string, { actividad: string, entidad: string, count: number }>();
        data.forEach(item => {
            const key = `${item.actividad}-${item.entidad}`;
            if (!groups.has(key)) {
                groups.set(key, { actividad: item.actividad, entidad: item.entidad, count: 0 });
            }
            groups.get(key)!.count++;
        });

        res.json(Array.from(groups.values()));
    } catch (e) {
        res.status(500).json({ error: 'Error generating otras gestiones report' });
    }
};

export const getOtrasReportByPeriod = async (req: AuthRequest, res: Response) => {
    const filters = req.query as any;
    try {
        const where: any = {};
        if (filters.fecha_inicio || filters.fecha_fin) {
            where.fecha = {};
            if (filters.fecha_inicio) where.fecha.gte = new Date(filters.fecha_inicio);
            if (filters.fecha_fin) where.fecha.lte = new Date(filters.fecha_fin);
        }

        if (filters.actividades) {
            const actList = Array.isArray(filters.actividades) ? filters.actividades : filters.actividades.split(',');
            where.actividad = { in: actList };
        }

        const data = await prisma.otraGestion.findMany({ where });
        const groups = new Map<string, number>();

        data.forEach(o => {
            let key = '';
            const date = new Date(o.fecha);
            if (filters.groupBy === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (filters.groupBy === 'year') {
                key = `${date.getFullYear()}`;
            } else {
                key = o.actividad;
            }
            groups.set(key, (groups.get(key) || 0) + 1);
        });

        const result = Array.from(groups.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => a.label.localeCompare(b.label));

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'Error grouping otras gestiones' });
    }
};
