import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : 'http://localhost:3001/api',
});

export const getParts = async () => (await api.get('/parts')).data;
export const addPart = async (part: any) => (await api.post('/parts', part)).data;
export const updatePart = async (id: number, part: any) => (await api.put(`/parts/${id}`, part)).data;
export const deletePart = async (id: number) => (await api.delete(`/parts/${id}`)).data;
export const activatePart = async (id: number, duration_days: number) => (await api.post(`/parts/${id}/activate`, { duration_days })).data;
export const deactivatePart = async (id: number) => (await api.post(`/parts/${id}/deactivate`)).data;
export const getSettings = async () => (await api.get('/settings')).data;
export const updateSettings = async (settings: any) => (await api.post('/settings', settings)).data;
export const testDiscord = async () => (await api.post('/discord/test')).data;
