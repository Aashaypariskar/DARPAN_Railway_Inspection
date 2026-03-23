import api from "../services/api";

export const getSummary = () => api.get("/monitoring/summary");

export const getSessions = (page = 1, limit = 25, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`/monitoring/sessions?${params.toString()}`);
};

export const getDefects = (page = 1, limit = 25, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`/monitoring/defects?${params.toString()}`);
};

export const getUsers = () => api.get("/admin/users");
export const getInspectors = getUsers;

export const createUser = (data) => api.post("/admin/create-user", data);
export const updateUser = (id, data) => api.put(`/admin/user/${id}`, data);
export const deleteUser = (id) => api.delete(`/admin/user/${id}`);
export const permanentDeleteUser = (id) => api.delete(`/admin/user/${id}/permanent`);
export const resetUserPassword = (id, password) =>
    api.put(`/admin/user/${id}/reset-password`, { password });

export const getAdminMetadata = () => api.get("/admin/metadata");

export const getAuditLogs = (page = 1, limit = 20) =>
    api.get(`/admin/audit-logs?page=${page}&limit=${limit}`);