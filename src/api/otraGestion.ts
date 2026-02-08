import client from './client';

export const otraGestionApi = {
    getAll: async (params?: any) => {
        const response = await client.get('/otra-gestion', { params });
        return response.data;
    },
    create: async (data: any) => {
        const response = await client.post('/otra-gestion', data);
        return response.data;
    },
    update: async (id: number, data: any) => {
        const response = await client.put(`/otra-gestion/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await client.delete(`/otra-gestion/${id}`);
        return response.data;
    },
    addTipoActividad: async (nombre: string) => {
        const response = await client.post('/config/tipos-actividad', { nombre });
        return response.data;
    },
    updateTipoActividad: async (id: number, nombre: string) => {
        const response = await client.put(`/config/tipos-actividad/${id}`, { nombre }); // Need to add this to backend
        return response.data;
    },
    deleteTipoActividad: async (id: number) => {
        const response = await client.delete(`/config/tipos-actividad/${id}`);
        return response.data;
    },
    getTiposActividad: async () => {
        const response = await client.get('/config/tipos-actividad');
        return response.data;
    },
    getSystemConfig: async () => {
        const response = await client.get('/config/system');
        return response.data;
    }
};
