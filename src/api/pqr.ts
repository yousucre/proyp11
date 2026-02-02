import client from './client';
import { PQR } from '../db/types';

export const pqrApi = {
    getAll: async (params?: any) => {
        const response = await client.get('/pqr', { params });
        return response.data;
    },
    getById: async (id: number) => {
        const response = await client.get(`/pqr/${id}`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await client.post('/pqr', data);
        return response.data;
    },
    update: async (id: number, data: Partial<PQR>) => {
        const response = await client.put(`/pqr/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await client.delete(`/pqr/${id}`);
        return response.data;
    },
    createActuacion: async (id: number, data: any) => {
        const response = await client.post(`/pqr/${id}/actuacion`, data);
        return response.data;
    },
    getActuaciones: async (id: number) => {
        const pqr = await pqrApi.getById(id);
        return pqr.actuaciones || [];
    }
};
