import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : 'http://localhost:3001/api',
});

export const fetchKPIs = (filters: any) => api.post('/kpi', filters).then(res => res.data);
export const fetchChartData = (type: string, filters: any) => api.post(`/charts/${type}`, filters).then(res => res.data);
export const fetchForecast = (filters?: any) => api.post('/forecast', filters || {}).then(res => res.data);
export const fetchRecommendations = (filters?: any) => api.post('/recommendations', filters || {}).then(res => res.data);
export const fetchOLAP = (params: any) => api.post('/olap', params).then(res => res.data);
export const fetchOptions = () => api.get('/options').then(res => res.data);

export default api;
