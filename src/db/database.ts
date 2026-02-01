import Dexie, { type Table } from 'dexie';
import type { Solicitante, PQR, Expediente, Actuacion, DashboardStats, PQRWithDetails, ExpedienteDocumento, TipoExpediente, OtraGestion, TipoActividad, QuickNote, SystemConfig } from './types';

export class PQRDatabase extends Dexie {
    solicitantes!: Table<Solicitante, number>;
    pqr!: Table<PQR, number>;
    expedientes!: Table<Expediente, number>;
    actuaciones!: Table<Actuacion, number>;
    expediente_documentos!: Table<ExpedienteDocumento, number>;
    tipo_expediente!: Table<TipoExpediente, number>;
    otras_gestiones!: Table<OtraGestion, number>;
    tipos_actividad!: Table<TipoActividad, number>;
    quick_notes!: Table<QuickNote, number>;
    config!: Table<SystemConfig, number>;

    constructor() {
        super('PQRSystem');

        this.version(11).stores({
            solicitantes: '++id, numero_identificacion, [tipo_identificacion+numero_identificacion]',
            pqr: '++id, radicado, id_solicitante, estado, fecha_radicacion, fecha_vencimiento',
            expedientes: '++id, numero_expediente, estado, fecha_apertura, tipo',
            actuaciones: '++id, id_pqr, fecha_actuacion',
            expediente_documentos: '++id, id_expediente, fecha_subida',
            tipo_expediente: '++id, nombre',
            otras_gestiones: '++id, cedula, nombres, fecha',
            tipos_actividad: '++id, nombre',
            expediente_bitacora: '++id, id_expediente, fecha',
            quick_notes: '++id, posicion',
            config: '++id',
            recovery_tokens: '++id, token, email'
        });
        this.quick_notes = this.table('quick_notes');
        this.expediente_documentos = this.table('expediente_documentos');
        this.tipo_expediente = this.table('tipo_expediente');
        this.otras_gestiones = this.table('otras_gestiones');
        this.tipos_actividad = this.table('tipos_actividad');
        this.config = this.table('config');
    }

    // --- Métodos de Configuración ---
    async getConfig(): Promise<SystemConfig | undefined> {
        return await this.config.toCollection().first();
    }

    async saveConfig(data: Partial<SystemConfig>): Promise<void> {
        const current = await this.getConfig();
        if (current) {
            await this.config.update(current.id!, data);
        } else {
            await this.config.add({
                plazo_peticion: 15,
                plazo_queja: 15,
                plazo_reclamo: 15,
                plazo_recurso: 30,
                prefijo_radicado: 'PQR',
                backup_automatico: true,
                backup_frecuencia: 7,
                first_setup_done: false,
                ...data
            } as SystemConfig);
        }
    }

    // --- Métodos de Recuperación de Contraseña ---
    async createRecoveryToken(email: string): Promise<string> {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expires = new Date();
        expires.setHours(expires.getHours() + 1); // Token válido por 1 hora

        await this.table('recovery_tokens').add({
            token,
            email,
            expires
        });

        return token;
    }

    async verifyRecoveryToken(token: string): Promise<string | null> {
        const record = await this.table('recovery_tokens').where('token').equals(token).first();
        if (!record) return null;

        if (new Date() > new Date(record.expires)) {
            await this.table('recovery_tokens').delete(record.id);
            return null;
        }

        return record.email;
    }

    async deleteRecoveryToken(token: string): Promise<void> {
        await this.table('recovery_tokens').where('token').equals(token).delete();
    }


    async exportDatabase(): Promise<any> {
        const result: any = {};
        const tables = [
            'solicitantes', 'pqr', 'expedientes', 'actuaciones',
            'expediente_documentos', 'tipo_expediente', 'otras_gestiones',
            'tipos_actividad', 'quick_notes', 'config'
        ];

        for (const tableName of tables) {
            result[tableName] = await this.table(tableName).toArray();
        }

        return result;
    }


    // --- Métodos de Bitácora ---
    async addLogToExpediente(data: { id_expediente: number, accion: string, detalle: string, usuario?: string, adjunto_id?: number }): Promise<void> {
        await this.table('expediente_bitacora').add({
            ...data,
            fecha: new Date()
        });
    }

    async getExpedienteLogs(idExpediente: number): Promise<any[]> {
        return await this.table('expediente_bitacora')
            .where('id_expediente')
            .equals(idExpediente)
            .reverse()
            .sortBy('fecha');
    }

    async getStats(): Promise<DashboardStats> {
        const total = await this.pqr.count();
        const allPqrs = await this.pqr.toArray();

        const byStatusMap = new Map<string, number>();
        allPqrs.forEach(pqr => {
            byStatusMap.set(pqr.estado, (byStatusMap.get(pqr.estado) || 0) + 1);
        });

        const byStatus = Array.from(byStatusMap.entries()).map(([estado, count]) => ({
            estado,
            count
        }));

        const expedientes = await this.expedientes.count();

        return { total, byStatus, expedientes };
    }

    async createPQR(data: any): Promise<{ id: number; radicado: string }> {
        return await this.transaction('rw', this.solicitantes, this.pqr, async () => {
            // 1. Create or Get Solicitante
            let solicitante = await this.solicitantes
                .where('numero_identificacion')
                .equals(data.numero_identificacion)
                .first();

            if (!solicitante) {
                const solicitanteId = await this.solicitantes.add({
                    tipo_identificacion: data.tipo_identificacion,
                    numero_identificacion: data.numero_identificacion,
                    nombre_completo: data.nombre_completo,
                    email: data.email,
                    telefono: data.telefono,
                    direccion: data.direccion,
                    created_at: new Date()
                });
                solicitante = { id: solicitanteId } as Solicitante;
            }

            // 2. Generate Radicado Number
            let radicado = data.manual_radicado;

            if (!radicado) {
                const currentYear = new Date().getFullYear();
                const yearPqrs = await this.pqr
                    .filter(p => new Date(p.fecha_radicacion).getFullYear() === currentYear)
                    .count();
                const sequence = (yearPqrs + 1).toString().padStart(4, '0');
                radicado = `${currentYear}-PQR-${sequence}`;
            }

            // 3. Insert PQR
            const pqrId = await this.pqr.add({
                radicado,
                fecha_radicacion: new Date(),
                id_solicitante: solicitante.id!,
                tipo_pqr: data.tipo_pqr,
                asunto: data.asunto,
                estado: 'Registrada',
                fecha_vencimiento: data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : undefined,
                canal_recepcion: data.canal_recepcion,
                adjunto_pdf: data.adjunto_pdf,
                adjunto_nombre: data.adjunto_nombre
            });

            return { id: pqrId, radicado };
        });
    }

    async getExpedientes(filter?: { tipo?: string, estado?: string }): Promise<Expediente[]> {

        if (filter?.tipo && filter?.estado) {
            // Using reverse().sortBy('fecha_apertura') usually requires a collection
            // Let's filter manually on the array for complexity if both are present
            const results = await this.expedientes.where('tipo').equals(filter.tipo).reverse().sortBy('fecha_apertura');
            return results.filter(e => e.estado === filter.estado);
        } else if (filter?.tipo) {
            return await this.expedientes.where('tipo').equals(filter.tipo).reverse().sortBy('fecha_apertura');
        } else if (filter?.estado) {
            return await this.expedientes.where('estado').equals(filter.estado).reverse().sortBy('fecha_apertura');
        }

        return await this.expedientes.reverse().sortBy('fecha_apertura');
    }

    async createExpediente(data: any): Promise<{ id: number }> {
        const id = await this.expedientes.add({
            numero_expediente: data.numero_expediente,
            titulo: data.titulo,
            tipo: data.tipo,
            descripcion: data.descripcion,
            fecha_apertura: new Date(),
            estado: 'Abierto'
        });
        return { id };
    }

    async updateExpediente(id: number, data: any): Promise<void> {
        await this.expedientes.update(id, data);
    }

    async updatePQRStatus(id: number, estado: string): Promise<void> {
        await this.pqr.update(id, { estado });
    }

    async updatePQRVoucher(id: number, blob: Blob): Promise<void> {
        await this.pqr.update(id, { comprobante_pdf: blob });
    }

    async deletePQR(id: number): Promise<void> {
        await this.transaction('rw', [this.pqr, this.actuaciones], async () => {
            await this.pqr.delete(id);
            await this.actuaciones.where('id_pqr').equals(id).delete();
        });
    }

    async getPQRById(id: number): Promise<PQRWithDetails | null> {
        const pqr = await this.pqr.get(id);
        if (!pqr) return null;

        const solicitante = await this.solicitantes.get(pqr.id_solicitante);
        if (!solicitante) return null;

        return {
            ...pqr,
            numero_identificacion: solicitante.numero_identificacion,
            nombre_completo: solicitante.nombre_completo,
            email: solicitante.email,
            telefono: solicitante.telefono,
            direccion: solicitante.direccion,
            canal_recepcion: pqr.canal_recepcion,
            asunto: pqr.asunto
        };
    }

    async updatePQR(id: number, data: Partial<PQR>): Promise<void> {
        await this.pqr.update(id, data);
    }

    async updateSolicitante(id: number, data: Partial<Solicitante>): Promise<void> {
        await this.solicitantes.update(id, data);
    }


    async createActuacion(data: any): Promise<{ id: number }> {
        const id = await this.actuaciones.add({
            id_pqr: data.id_pqr,
            fecha_actuacion: new Date(),
            tipo_actuacion: data.tipo_actuacion,
            observacion: data.observacion,
            usuario: data.usuario || 'Sistema',
            adjunto_pdf: data.adjunto_pdf,
            adjunto_nombre: data.adjunto_nombre
        });
        return { id };
    }

    async getReportStats(filters: any): Promise<any> {
        let query = this.pqr.toCollection();

        if (filters.fecha_inicio || filters.fecha_fin) {
            query = query.filter(p => {
                const pDate = new Date(p.fecha_radicacion).getTime();
                if (filters.fecha_inicio && pDate < new Date(filters.fecha_inicio).getTime()) return false;
                if (filters.fecha_fin && pDate > new Date(filters.fecha_fin).getTime()) return false;
                return true;
            });
        }

        if (filters.tipo_pqr) {
            query = query.filter(p => p.tipo_pqr === filters.tipo_pqr);
        }

        if (filters.estado) {
            query = query.filter(p => p.estado === filters.estado);
        }

        const pqrs = await query.toArray();
        const totalPQR = pqrs.length;

        // Simple logic for "vencidas" (just for example, would depend on pqr.fecha_vencimiento)
        const now = new Date().getTime();
        const vencidasCount = pqrs.filter(p => p.fecha_vencimiento && new Date(p.fecha_vencimiento).getTime() < now && p.estado !== 'Respondida' && p.estado !== 'Cerrada').length;

        const porTipo = Array.from(pqrs.reduce((acc, p) => acc.set(p.tipo_pqr, (acc.get(p.tipo_pqr) || 0) + 1), new Map()).entries()).map(([tipo, count]) => ({ tipo, count }));
        const porEstado = Array.from(pqrs.reduce((acc, p) => acc.set(p.estado, (acc.get(p.estado) || 0) + 1), new Map()).entries()).map(([estado, count]) => ({ estado, count }));
        const porCanal = Array.from(pqrs.reduce((acc, p) => acc.set(p.canal_recepcion || 'Desconocido', (acc.get(p.canal_recepcion || 'Desconocido') || 0) + 1), new Map()).entries()).map(([canal, count]) => ({ canal, count }));

        return {
            totalPQR,
            vencidas: vencidasCount,
            porTipo,
            porEstado,
            porCanal
        };
    }

    async getActuaciones(idPqr: number): Promise<Actuacion[]> {
        return await this.actuaciones.where('id_pqr').equals(idPqr).reverse().sortBy('fecha_actuacion');
    }

    async addDocumentToExpediente(data: any): Promise<number> {
        return await this.expediente_documentos.add({
            id_expediente: data.id_expediente,
            fecha_subida: new Date(),
            nombre_archivo: data.nombre_archivo,
            blob_archivo: data.blob_archivo,
            descripcion: data.descripcion
        });
    }

    async getExpedienteDocuments(idExpediente: number): Promise<ExpedienteDocumento[]> {
        return await this.expediente_documentos.where('id_expediente').equals(idExpediente).reverse().sortBy('fecha_subida');
    }

    async deleteDocumentToExpediente(id: number): Promise<void> {
        await this.expediente_documentos.delete(id);
    }

    async getPendingPQRs(): Promise<any[]> {
        const list = await this.pqr.where('estado').equals('En Trámite').toArray();
        const results = [];
        for (const pqr of list) {
            const sol = await this.solicitantes.get(pqr.id_solicitante);
            results.push({
                ...pqr,
                nombre_completo: sol?.nombre_completo || 'N/A'
            });
        }
        return results;
    }

    async searchPQRs(filters: any): Promise<PQRWithDetails[]> {
        let query = this.pqr.toCollection();

        // Apply primary filter if exists
        if (filters.estado) {
            query = this.pqr.where('estado').equals(filters.estado);
        }

        // Fetch and sort manually by date descending to ensure correctness
        let pqrs = await query.toArray();
        pqrs.sort((a, b) => new Date(b.fecha_radicacion).getTime() - new Date(a.fecha_radicacion).getTime());

        const results: PQRWithDetails[] = [];

        for (const pqr of pqrs) {
            // Apply radicado filter early if present to avoid DB lookups for non-matching ones
            if (filters.radicado && !pqr.radicado.toLowerCase().includes(filters.radicado.toLowerCase().trim())) {
                continue;
            }

            const solicitante = await this.solicitantes.get(pqr.id_solicitante);
            if (!solicitante) continue;

            // Apply solicitante text filter
            if (filters.solicitante) {
                const searchTerm = filters.solicitante.toLowerCase().trim();
                const nombreMatch = (solicitante.nombre_completo || '').toLowerCase().includes(searchTerm);
                const identificationMatch = (solicitante.numero_identificacion || '').toLowerCase().includes(searchTerm);

                if (!nombreMatch && !identificationMatch) {
                    continue;
                }
            }

            results.push({
                ...pqr,
                numero_identificacion: solicitante.numero_identificacion,
                nombre_completo: solicitante.nombre_completo,
                email: solicitante.email,
                telefono: solicitante.telefono,
                direccion: solicitante.direccion,
                canal_recepcion: pqr.canal_recepcion,
                asunto: pqr.asunto
            });
        }

        return results;
    }

    // --- Métodos de Tipo de Expediente ---
    async getTiposExpediente(): Promise<TipoExpediente[]> {
        return await this.tipo_expediente.toArray();
    }

    async addTipoExpediente(nombre: string): Promise<number> {
        return await this.tipo_expediente.add({ nombre });
    }

    async updateTipoExpediente(id: number, nombre: string): Promise<void> {
        await this.tipo_expediente.update(id, { nombre });
    }

    async getPQRsByPeriod(filters: { fecha_inicio?: string; fecha_fin?: string; tipo_pqr?: string; groupBy?: 'tipo' | 'month' | 'year' }): Promise<any[]> {
        let query = this.pqr.toCollection();
        if (filters.fecha_inicio) {
            const start = new Date(filters.fecha_inicio).getTime();
            query = query.filter(p => new Date(p.fecha_radicacion).getTime() >= start);
        }
        if (filters.fecha_fin) {
            const end = new Date(filters.fecha_fin).getTime();
            query = query.filter(p => new Date(p.fecha_radicacion).getTime() <= end);
        }
        if (filters.tipo_pqr) {
            query = query.filter(p => p.tipo_pqr === filters.tipo_pqr);
        }

        const data = await query.toArray();
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

        return Array.from(groups.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    async getOtrasReportByPeriod(filters: { fecha_inicio?: string; fecha_fin?: string; actividades?: string[]; groupBy?: 'actividad' | 'month' | 'year' }): Promise<any[]> {
        let query = this.otras_gestiones.toCollection();
        if (filters.fecha_inicio) {
            const start = new Date(filters.fecha_inicio).getTime();
            query = query.filter(o => new Date(o.fecha).getTime() >= start);
        }
        if (filters.fecha_fin) {
            const end = new Date(filters.fecha_fin).getTime();
            query = query.filter(o => new Date(o.fecha).getTime() <= end);
        }
        if (filters.actividades && filters.actividades.length > 0) {
            query = query.filter(o => filters.actividades!.includes(o.actividad));
        }

        const data = await query.toArray();
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

        return Array.from(groups.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    async deleteTipoExpediente(id: number): Promise<void> {
        await this.tipo_expediente.delete(id);
    }

    // --- Métodos de Otras Gestiones ---
    async getOtrasGestiones(): Promise<OtraGestion[]> {
        try {
            return await this.otras_gestiones.toCollection().reverse().sortBy('fecha');
        } catch (e) {
            console.error("Error sorting by fecha, falling back to manual sort", e);
            const all = await this.otras_gestiones.toArray();
            return all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        }
    }

    async addOtraGestion(data: Omit<OtraGestion, 'id' | 'fecha'>): Promise<number> {
        return await this.otras_gestiones.add({
            ...data,
            fecha: new Date()
        });
    }

    async updateOtraGestion(id: number, data: Partial<OtraGestion>): Promise<void> {
        await this.otras_gestiones.update(id, data);
    }

    async deleteOtraGestion(id: number): Promise<void> {
        await this.otras_gestiones.delete(id);
    }

    // --- Métodos de Tipos de Actividad ---
    async getTiposActividad(): Promise<TipoActividad[]> {
        return await this.tipos_actividad.toArray();
    }

    async addTipoActividad(nombre: string): Promise<number> {
        return await this.tipos_actividad.add({ nombre });
    }

    async updateTipoActividad(id: number, nombre: string): Promise<void> {
        await this.tipos_actividad.update(id, { nombre });
    }

    async deleteTipoActividad(id: number): Promise<void> {
        return await this.tipos_actividad.delete(id);
    }

    // --- Métodos de Reportes ---
    async getOtrasGestionesReport(filters: { fecha_inicio?: string; fecha_fin?: string; actividades?: string[] }): Promise<any[]> {
        let query = this.otras_gestiones.toCollection();

        if (filters.fecha_inicio || filters.fecha_fin) {
            query = query.filter(g => {
                const gDate = new Date(g.fecha).getTime();
                if (filters.fecha_inicio && gDate < new Date(filters.fecha_inicio).getTime()) return false;
                if (filters.fecha_fin && gDate > new Date(filters.fecha_fin).getTime()) return false;
                return true;
            });
        }

        if (filters.actividades && filters.actividades.length > 0) {
            query = query.filter(g => filters.actividades!.includes(g.actividad));
        }

        const data = await query.toArray();

        // Group by actividad and entidad
        const groups = new Map<string, { actividad: string, entidad: string, count: number }>();

        data.forEach(item => {
            const key = `${item.actividad}-${item.entidad}`;
            if (!groups.has(key)) {
                groups.set(key, { actividad: item.actividad, entidad: item.entidad, count: 0 });
            }
            groups.get(key)!.count++;
        });

        return Array.from(groups.values());
    }

    async getGeneralReportData(): Promise<{ pqrs: any[], otras: any[] }> {
        const pqrs = await this.pqr.toArray();
        const otras = await this.otras_gestiones.toArray();

        const pqrByType = new Map<string, number>();
        pqrs.forEach(p => {
            pqrByType.set(p.tipo_pqr, (pqrByType.get(p.tipo_pqr) || 0) + 1);
        });

        const otrasByActividad = new Map<string, number>();
        otras.forEach(o => {
            otrasByActividad.set(o.actividad, (otrasByActividad.get(o.actividad) || 0) + 1);
        });

        return {
            pqrs: Array.from(pqrByType.entries()).map(([tipo, count]) => ({ tipo, count })),
            otras: Array.from(otrasByActividad.entries()).map(([actividad, count]) => ({ actividad, count }))
        };
    }

    // --- Métodos de Quick Notes ---
    async getQuickNotes(): Promise<QuickNote[]> {
        return await this.quick_notes.orderBy('posicion').toArray();
    }

    async addQuickNote(texto: string): Promise<number> {
        const count = await this.quick_notes.count();
        return await this.quick_notes.add({
            texto,
            posicion: count,
            fecha_creacion: new Date()
        });
    }

    async updateQuickNote(id: number, texto: string): Promise<void> {
        await this.quick_notes.update(id, { texto });
    }

    async deleteQuickNote(id: number): Promise<void> {
        await this.quick_notes.delete(id);
        // Re-adjust positions
        const notes = await this.getQuickNotes();
        for (let i = 0; i < notes.length; i++) {
            await this.quick_notes.update(notes[i].id!, { posicion: i });
        }
    }

    async updateNotesOrder(notes: QuickNote[]): Promise<void> {
        await this.transaction('rw', this.quick_notes, async () => {
            for (let i = 0; i < notes.length; i++) {
                await this.quick_notes.update(notes[i].id!, { posicion: i });
            }
        });
    }
}

export const db = new PQRDatabase();
