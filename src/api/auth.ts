import client from './client';

export const authApi = {
    login: async (password: string) => {
        const response = await client.post('/auth/login', { password });
        return response.data;
    },
    setup: async (data: any) => {
        const response = await client.post('/auth/setup', data);
        return response.data;
    },
    forgotPassword: async (email: string) => {
        const response = await client.post('/auth/forgot-password', { email });
        return response.data;
    },
    verifyToken: async (token: string) => {
        const response = await client.post('/auth/verify-token', { token });
        return response.data;
    },
    resetPassword: async (token: string, password: string) => {
        const response = await client.post('/auth/reset-password', { token, password });
        return response.data;
    }
};
