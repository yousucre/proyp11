import client from './client';

export const configApi = {
    getTiposActividad: async () => {
        const response = await client.get('/config/tipos-actividad');
        return response.data;
    },
    getTiposExpediente: async () => {
        const response = await client.get('/config/tipos-expediente');
        return response.data;
    },
    getSystemConfig: async () => {
        const response = await client.get('/config/system');
        return response.data;
    },
    updateSystemConfig: async (data: any) => {
        const response = await client.put('/config/system', data);
        return response.data;
    }
};
