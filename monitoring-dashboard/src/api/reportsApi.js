import axios from 'axios';
import { API_BASE_URL } from '../utils/urlHelper';

const PRIMARY_URL = API_BASE_URL;
const FALLBACK_URL = import.meta.env.VITE_API_FALLBACK_URL;
const URLS = [PRIMARY_URL, FALLBACK_URL].filter(Boolean);
const currentUrlIndex = 0;

const api = axios.create({
    baseURL: URLS[0],
});

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Response Interceptor for handling auth failures and fallbacks
let isRedirecting = false;
api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if ((!error.response || error.response.status >= 500) && URLS.length > 1) {
            if (!originalRequest._retryCount) originalRequest._retryCount = 0;
            if (originalRequest._retryCount < URLS.length - 1) {
                originalRequest._retryCount++;
                currentUrlIndex = (currentUrlIndex + 1) % URLS.length;
                const newUrl = URLS[currentUrlIndex];
                originalRequest.baseURL = newUrl;
                api.defaults.baseURL = newUrl;
                console.warn(`[API FALLBACK] Retrying ${originalRequest.url} with fallback URL: ${newUrl}`);
                return api(originalRequest);
            }
        }

        if (error.response?.status === 401 && !isRedirecting) {
            isRedirecting = true;
            console.warn('[AUTH] Session expired, redirecting to login...');

            // Clear credentials
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect with message param
            window.location.href = '/login?message=session_expired';

            // Reset flag after a delay to allow page transition
            setTimeout(() => { isRedirecting = false; }, 5000);
        }
        return Promise.reject(error);
    }
);

export const getReportSummary = (filters) => api.get('/reports/summary', { params: filters });
export const getInspectorReport = (filters) => api.get('/reports/inspectors', { params: filters });
export const getAssetReport = (filters) => api.get('/reports/assets', { params: filters });
export const getAgingReport = (filters) => api.get('/reports/defect-aging', { params: filters });
export const getRepeatedReport = (params) => api.get('/reports/repeated', { params });
export const getStrategicDashboard = () => api.get('/reports/strategic-dashboard');

export const exportReport = (params) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/reports/export?${queryString}`;
    return api.get(url, { responseType: 'blob' });
};

// Dedicated CSV export — calls /reports/export/csv
export const exportReportCSV = (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/reports/export/csv?${queryString}`, { responseType: 'blob' });
};

// Dedicated Excel export — calls /reports/export/excel
export const exportReportExcel = (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/reports/export/excel?${queryString}`, { responseType: 'blob' });
};

export const getRecentSessions = (params) => api.get('/reports/recent', { params });
export const getSessionReport = (sessionId) => api.get(`/reports/session/${sessionId}`);
export const exportSessionPDF = (sessionId) => api.get(`/reports/session/${sessionId}/export`, { responseType: 'blob' });
export const getSessionDefects = (reportingId) => api.get(`/reports/session/${reportingId}/defects`);
