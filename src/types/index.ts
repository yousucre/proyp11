// Tipos de datos principales del sistema PQR

export interface Solicitante {
    id: number;
    tipo_identificacion: 'CC' | 'NIT' | 'CE' | 'TI';
    numero_identificacion: string;
    nombre_completo: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    created_at: string;
}

export interface PQR {
    id: number;
    radicado: string;
    fecha_radicacion: string;
    id_solicitante: number;
    tipo_pqr: 'Petición' | 'Queja' | 'Reclamo' | 'Recurso' | 'Solicitud de Información';
    asunto: string;
    estado: 'Registrada' | 'En Trámite' | 'Respondida' | 'Cerrada' | 'Archivada';
    fecha_vencimiento?: string;
    canal_recepcion: 'Presencial' | 'Correo Electrónico' | 'Página Web' | 'Telefónico' | 'Ventanilla Única';
    // Datos del solicitante (cuando se hace JOIN)
    numero_identificacion?: string;
    nombre_completo?: string;
}

export interface Expediente {
    id: number;
    numero_expediente: string;
    titulo: string;
    fecha_apertura: string;
    estado: 'Abierto' | 'Cerrado' | 'Archivado';
    descripcion?: string;
}

export interface Actuacion {
    id: number;
    id_pqr: number;
    fecha_actuacion: string;
    tipo_actuacion: 'Respuesta' | 'Traslado' | 'Archivo' | 'Observación' | 'Cambio de Estado';
    observacion?: string;
    usuario?: string;
}

export interface PQRExpediente {
    id_pqr: number;
    id_expediente: number;
}

// Tipos para formularios
export interface PQRFormData {
    tipo_identificacion: string;
    numero_identificacion: string;
    nombre_completo: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    tipo_pqr: string;
    asunto: string;
    fecha_vencimiento?: string;
    canal_recepcion: string;
    manual_radicado?: string;
}

export interface ExpedienteFormData {
    numero_expediente: string;
    titulo: string;
    descripcion?: string;
}

export interface ActuacionFormData {
    id_pqr: number;
    tipo_actuacion: string;
    observacion?: string;
    usuario?: string;
}

// Tipos para estadísticas y reportes
export interface DashboardStats {
    total: number;
    byStatus: { estado: string; count: number }[];
    expedientes: number;
}

export interface ReportFilters {
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_pqr?: string;
    estado?: string;
    canal_recepcion?: string;
}

export interface ReportData {
    totalPQR: number;
    porTipo: { tipo: string; count: number }[];
    porEstado: { estado: string; count: number }[];
    porCanal: { canal: string; count: number }[];
    tiempoPromedio: number;
    vencidas: number;
}

// Tipos para búsqueda
export interface SearchFilters {
    radicado?: string;
    solicitante?: string;
    estado?: string;
    tipo_pqr?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
}

// Configuración del sistema
export interface SystemConfig {
    plazo_peticion: number; // días
    plazo_queja: number;
    plazo_reclamo: number;
    plazo_recurso: number;
    prefijo_radicado: string;
    backup_automatico: boolean;
    backup_frecuencia: number; // días
}
