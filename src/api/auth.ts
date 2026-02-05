import client from './client';

export const authApi = {
    
    login: async (email: string, password: string) => {
    const response = await client.post('/api/auth/login', {
        email,
        password
    });
    return response.data;
},


    setup: async (data: any) => {
        const response = await client.post('/api/auth/setup', data);
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await client.post('/api/auth/forgot-password', { email });
        return response.data;
    },

    verifyToken: async (token: string) => {
        const response = await client.post('/api/auth/verify-token', { token });
        return response.data;
    },

    resetPassword: async (token: string, password: string) => {
        const response = await client.post('/api/auth/reset-password', { token, password });
        return response.data;
    }
};
