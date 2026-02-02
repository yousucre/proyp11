import client from './client';

export const reportApi = {
    getStats: async (filters: any) => {
        const response = await client.get('/report/stats', { params: filters });
        return response.data;
    },
    getByPeriod: async (filters: any) => {
        const response = await client.get('/report/by-period', { params: filters });
        return response.data;
    },
    getGeneral: async () => {
        const response = await client.get('/report/general');
        return response.data;
    },
    getOtras: async (filters: any) => {
        const response = await client.get('/report/otras', { params: filters });
        return response.data;
    },
    getOtrasByPeriod: async (filters: any) => {
        const response = await client.get('/report/otras/by-period', { params: filters });
        return response.data;
    }
};
