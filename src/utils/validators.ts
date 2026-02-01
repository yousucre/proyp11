// Validation utilities for forms

/**
 * Validate Colombian ID number (Cédula)
 */
export function validateCedula(cedula: string): boolean {
    // Basic validation: only numbers, between 6 and 10 digits
    const regex = /^\d{6,10}$/;
    return regex.test(cedula);
}

/**
 * Validate NIT (Colombian tax ID)
 */
export function validateNIT(nit: string): boolean {
    // Remove hyphens and spaces
    const cleanNIT = nit.replace(/[-\s]/g, '');

    // Should be 9 or 10 digits
    if (!/^\d{9,10}$/.test(cleanNIT)) return false;

    return true;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate phone number (Colombian format)
 */
export function validatePhone(phone: string): boolean {
    // Colombian phone: 7 or 10 digits
    const cleanPhone = phone.replace(/[\s-()]/g, '');
    return /^\d{7,10}$/.test(cleanPhone);
}

/**
 * Validate required field
 */
export function validateRequired(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

/**
 * Validate date is not in the past
 */
export function validateFutureDate(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to compare only dates

    return date >= now;
}

/**
 * Validate radicado format (YYYY-PQR-NNNN)
 */
export function validateRadicado(radicado: string): boolean {
    const regex = /^\d{4}-PQR-\d{4}$/;
    return regex.test(radicado);
}

/**
 * Validate expediente number format
 */
export function validateExpediente(numero: string): boolean {
    // Allow alphanumeric with hyphens
    const regex = /^[A-Z0-9-]{4,20}$/i;
    return regex.test(numero);
}

/**
 * Generic form validator
 */
export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
    message?: string;
}

export interface ValidationErrors {
    [key: string]: string;
}

export function validateForm(
    data: Record<string, any>,
    rules: Record<string, ValidationRule>
): ValidationErrors {
    const errors: ValidationErrors = {};

    for (const [field, rule] of Object.entries(rules)) {
        const value = data[field];

        if (rule.required && !validateRequired(value)) {
            errors[field] = rule.message || 'Este campo es requerido';
            continue;
        }

        if (value && typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
                errors[field] = rule.message || `Mínimo ${rule.minLength} caracteres`;
                continue;
            }

            if (rule.maxLength && value.length > rule.maxLength) {
                errors[field] = rule.message || `Máximo ${rule.maxLength} caracteres`;
                continue;
            }

            if (rule.pattern && !rule.pattern.test(value)) {
                errors[field] = rule.message || 'Formato inválido';
                continue;
            }
        }

        if (rule.custom && !rule.custom(value)) {
            errors[field] = rule.message || 'Valor inválido';
        }
    }

    return errors;
}
