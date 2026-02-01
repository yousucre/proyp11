import client from './client';

export const dashboardApi = {
    getStats: async () => {
        const response = await client.get('/dashboard/stats');
        return response.data;
    },
    getPending: async () => {
        const response = await client.get('/dashboard/pending');
        return response.data;
    },
    getNotes: async () => {
        const response = await client.get('/dashboard/notes');
        return response.data;
    },
    addNote: async (texto: string) => {
        const response = await client.post('/dashboard/notes', { texto });
        return response.data;
    },
    updateNote: async (id: number, texto: string) => {
        const response = await client.put(`/dashboard/notes/${id}`, { texto });
        return response.data;
    },
    deleteNote: async (id: number) => {
        const response = await client.delete(`/dashboard/notes/${id}`);
        return response.data;
    },
    reorderNotes: async (notes: { id: number, posicion: number }[]) => {
        const response = await client.post('/dashboard/notes/reorder', { notes });
        return response.data;
    }
};
