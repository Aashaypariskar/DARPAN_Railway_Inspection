import api from "../services/api";

export const getReportSummary = (filters) =>
    api.get("/reports/summary", { params: filters });

export const getInspectorReport = (filters) =>
    api.get("/reports/inspectors", { params: filters });

export const getAssetReport = (filters) =>
    api.get("/reports/assets", { params: filters });

export const getAgingReport = (filters) =>
    api.get("/reports/defect-aging", { params: filters });

export const getRepeatedReport = (params) =>
    api.get("/reports/repeated", { params });

export const getStrategicDashboard = () =>
    api.get("/reports/strategic-dashboard");

export const exportReport = (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/export?${query}`, { responseType: "blob" });
};

export const exportReportCSV = (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/export/csv?${query}`, { responseType: "blob" });
};

export const exportReportExcel = (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reports/export/excel?${query}`, { responseType: "blob" });
};

export const getRecentSessions = (params) =>
    api.get("/reports/recent", { params });

export const getSessionReport = (sessionId) =>
    api.get(`/reports/session/${sessionId}`);

export const exportSessionPDF = (sessionId) =>
    api.get(`/reports/session/${sessionId}/export`, { responseType: "blob" });

export const getSessionDefects = (id) =>
    api.get(`/reports/session/${id}/defects`);