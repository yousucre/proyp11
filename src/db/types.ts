export interface Solicitante {
    id?: number;
    tipo_identificacion: string;
    numero_identificacion: string;
    nombre_completo: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    created_at?: Date;
}

export interface PQR {
    id?: number;
    radicado: string;
    fecha_radicacion: Date;
    id_solicitante: number;
    tipo_pqr: string;
    asunto: string;
    estado: string;
    fecha_vencimiento?: Date;
    canal_recepcion?: string;
    adjunto_pdf?: Blob;
    adjunto_nombre?: string;
    comprobante_pdf?: Blob; // Added for the requested voucher
}

export interface Expediente {
    id?: number;
    numero_expediente: string;
    titulo: string;
    tipo: string;
    fecha_apertura: Date;
    estado: string;
    descripcion?: string;
}

export interface TipoExpediente {
    id?: number;
    nombre: string;
}

export interface ExpedienteDocumento {
    id?: number;
    id_expediente: number;
    fecha_subida: Date;
    nombre_archivo: string;
    blob_archivo: Blob;
    descripcion?: string;
}

export interface Actuacion {
    id?: number;
    id_pqr: number;
    fecha_actuacion: Date;
    tipo_actuacion: string;
    observacion?: string;
    usuario?: string;
    adjunto_pdf?: Blob;
    adjunto_nombre?: string;
}

export interface PQRWithSolicitante extends PQR {
    numero_identificacion: string;
    nombre_completo: string;
}

export interface PQRWithDetails extends PQRWithSolicitante {
    email?: string;
    telefono?: string;
    direccion?: string;
    canal_recepcion?: string;
    asunto: string;
}

export interface DashboardStats {
    total: number;
    byStatus: Array<{ estado: string; count: number }>;
    expedientes: number;
}

export interface ReportFilters {
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_pqr?: string;
    estado?: string;
    canal_recepcion?: string;
    actividades?: string[];
}

export interface ReportData {
    totalPQR: number;
    vencidas: number;
    porTipo: Array<{ tipo: string; count: number }>;
    porEstado: Array<{ estado: string; count: number }>;
    porCanal: Array<{ canal: string; count: number }>;
}

export interface OtraGestion {
    id?: number;
    fecha: Date;
    cedula: string;
    nombres: string;
    telefono: string;
    entidad: string;
    actividad: string;
    observaciones?: string;
}

export interface TipoActividad {
    id?: number;
    nombre: string;
}

export interface ExpedienteBitacora {
    id?: number;
    id_expediente: number;
    fecha: Date;
    accion: string;
    detalle: string;
    usuario?: string;
    adjunto_id?: number;
}

export interface QuickNote {
    id?: number;
    texto: string;
    posicion: number;
    fecha_creacion: Date;
}

export interface SystemConfig {
    id?: number;
    plazo_peticion: number;
    plazo_queja: number;
    plazo_reclamo: number;
    plazo_recurso: number;
    prefijo_radicado: string;
    backup_automatico: boolean;
    backup_frecuencia: number;
    recovery_email_1?: string;
    recovery_email_2?: string;
    first_setup_done: boolean;
    entidad_logo?: Blob;
    entidad_nombre?: string;
    entidad_email?: string;
    entidad_telefono?: string;
    entidad_whatsapp?: string;
    entidad_nit?: string;
    hashed_password?: string;
}

