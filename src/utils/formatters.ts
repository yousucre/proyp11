// Utility functions for formatting data in the PQR system

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

/**
 * Format a datetime string to include time
 */
export function formatDateTime(dateString: string | undefined): string {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

/**
 * Get a color class based on PQR status
 */
export function getStatusColor(estado: string): string {
    const colors: Record<string, string> = {
        'Registrada': 'bg-blue-100 text-blue-800',
        'En Trámite': 'bg-yellow-100 text-yellow-800',
        'Respondida': 'bg-green-100 text-green-800',
        'Cerrada': 'bg-gray-100 text-gray-800',
        'Archivada': 'bg-purple-100 text-purple-800'
    };

    return colors[estado] || 'bg-gray-100 text-gray-800';
}

/**
 * Get a color class based on PQR type
 */
export function getTipoColor(tipo: string): string {
    const colors: Record<string, string> = {
        'Petición': 'bg-blue-500',
        'Queja': 'bg-red-500',
        'Reclamo': 'bg-orange-500',
        'Recurso': 'bg-purple-500',
        'Solicitud de Información': 'bg-teal-500'
    };

    return colors[tipo] || 'bg-gray-500';
}

/**
 * Check if a PQR is overdue
 */
export function isOverdue(fechaVencimiento: string | undefined, estado: string): boolean {
    if (!fechaVencimiento) return false;
    if (['Respondida', 'Cerrada', 'Archivada'].includes(estado)) return false;

    const vencimiento = new Date(fechaVencimiento);
    const now = new Date();

    return vencimiento < now;
}

/**
 * Calculate days remaining until due date
 */
export function daysRemaining(fechaVencimiento: string | undefined): number | null {
    if (!fechaVencimiento) return null;

    const vencimiento = new Date(fechaVencimiento);
    const now = new Date();

    const diffTime = vencimiento.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Format identification type
 */
export function formatTipoIdentificacion(tipo: string): string {
    const tipos: Record<string, string> = {
        'CC': 'Cédula de Ciudadanía',
        'NIT': 'NIT',
        'CE': 'Cédula de Extranjería',
        'TI': 'Tarjeta de Identidad'
    };

    return tipos[tipo] || tipo;
}

/**
 * Generate a simple hash for colors (for charts)
 */
export function stringToColor(str: string): string {
    const colors = [
        '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

/**
 * Export data to CSV
 */
export function exportToCSV(data: any[], filename: string) {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
