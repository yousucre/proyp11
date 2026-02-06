import client from './client';

export const authApi = {
    // LOGIN
    login: async (email: string, password: string) => {
        const response = await client.post('/api/auth/login', {
            email,
            password
        });
        return response.data;
    },

    // CONFIGURACIÓN INICIAL (primer acceso)
    setup: async (data: { email1: string; email2: string }) => {
        const response = await client.post('/api/auth/setup', data);
        return response.data;
    },

    // SOLICITAR RECUPERACIÓN DE CONTRASEÑA
    forgotPassword: async (email: string) => {
        const response = await client.post('/api/auth/forgot-password', {
            email
        });
        return response.data;
    },

    // VERIFICAR TOKEN DE RECUPERACIÓN
    verifyToken: async (token: string) => {
        const response = await client.post('/api/auth/verify-token', {
            token
        });
        return response.data;
    },

    // RESETEAR CONTRASEÑA
    resetPassword: async (token: string, password: string) => {
        const response = await client.post('/api/auth/reset-password', {
            token,
            password
        });
        return response.data;
    }
};


