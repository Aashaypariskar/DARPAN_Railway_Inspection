import axios from "axios";
import { API_BASE_URL } from "../utils/urlHelper";

const PRIMARY_URL = API_BASE_URL;
const FALLBACK_URL = import.meta.env.VITE_API_FALLBACK_URL;
const URLS = [PRIMARY_URL, FALLBACK_URL].filter(Boolean);
const currentUrlIndex = 0;

const api = axios.create({
    baseURL: URLS[0]
});

console.log("API URL:", URLS[0], "Fallback:", FALLBACK_URL);

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getSummary = () => api.get("/monitoring/summary");

api.interceptors.response.use(
    res => res,
    async err => {
        const originalRequest = err.config;

        if ((!err.response || err.response.status >= 500) && URLS.length > 1) {
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

        if (err.response?.status === 401) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export const getSessions = (page = 1, limit = 25, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`/monitoring/sessions?${params.toString()}`);
};

export const getDefects = (page = 1, limit = 25, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`/monitoring/defects?${params.toString()}`);
};

export const getUsers = () => api.get("/admin/users");
export const getInspectors = getUsers; // Alias for backward compatibility
export const createUser = (data) => api.post("/admin/create-user", data);
export const updateUser = (id, data) => api.put(`/admin/user/${id}`, data);
export const deleteUser = (id) => api.delete(`/admin/user/${id}`);
export const permanentDeleteUser = (id) => api.delete(`/admin/user/${id}/permanent`);
export const resetUserPassword = (id, password) => api.put(`/admin/user/${id}/reset-password`, { password });
export const getAdminMetadata = () => api.get("/admin/metadata");
export const getAuditLogs = (page = 1, limit = 20) => api.get(`/admin/audit-logs?page=${page}&limit=${limit}`);

export default api;
