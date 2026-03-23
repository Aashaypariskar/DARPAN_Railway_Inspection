import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL, ENV_NAME, PROD_URLS, IS_DEV } from '../config/environment';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

let currentBaseIndex = 0;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
});

// Inject JWT Token into requests
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('user_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // DEBUG: Log outgoing request details
    console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data instanceof FormData) {
        console.log(' - Body: FormData');
    } else if (config.data) {
        console.log(' - Body Keys:', Object.keys(config.data));
    }

    return config;
}, (error) => {
    console.error('[API REQUEST ERROR]', error);
    return Promise.reject(error);
});

// Response Interceptor for handling errors globally
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Fallback Logic for Network Errors or Server Errors (500+)
        // In development we do not switch to production URL; we stay local and fail fast.
        const fallbackUrls = IS_DEV ? [BASE_URL] : PROD_URLS;

        if ((!error.response || error.response.status >= 500) && fallbackUrls?.length > 1) {
            if (!originalRequest._retryCount) {
                originalRequest._retryCount = 0;
            }
            if (originalRequest._retryCount < fallbackUrls.length - 1) {
                originalRequest._retryCount++;
                currentBaseIndex = (currentBaseIndex + 1) % fallbackUrls.length;
                const newBaseUrl = fallbackUrls[currentBaseIndex];

                originalRequest.baseURL = newBaseUrl;
                api.defaults.baseURL = newBaseUrl;

                console.warn(`[API FALLBACK] Retrying ${originalRequest.url} with fallback URL: ${newBaseUrl}`);
                return api(originalRequest);
            }
        }

        const errorDetails = {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data,
            url: `${error.config?.baseURL}${error.config?.url}`,
            full_config_url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            headers: error.config?.headers
        };

        console.error('[API ERROR DETAILS]', JSON.stringify(errorDetails, null, 2));

        // If login itself fails with 401, don't trigger global logout logic (it's just wrong credentials)
        const isLogin = error.config?.url?.includes('login');

        if (error.response?.status === 401 && !isLogin) {
            console.warn('Token expired or invalid. Logging out...');
            await SecureStore.deleteItemAsync('user_token');
            await SecureStore.deleteItemAsync('user_data');
        }
        return Promise.reject(error);
    }
);

export const checkHealth = async () => {
    const res = await api.get('/health');
    return res.data;
};

export const getUserCategories = async () => {
    const res = await api.get('/user-categories');
    return res.data;
};

export const getTrains = async (categoryName) => {
    const res = await api.get(`/train-list?category_name=${encodeURIComponent(categoryName)}`);
    return res.data;
};

export const getCoaches = async (trainId, categoryName) => {
    let url = `/coach-list?category_name=${encodeURIComponent(categoryName)}`;
    if (trainId) url += `&train_id=${trainId}`;
    const res = await api.get(url);
    return res.data;
};

export const getInspectionProgress = async (params) => {
    const res = await api.get('/inspection/progress', { params });
    return res.data;
};

export const getInspectionAnswers = async (params) => {
    const res = await api.get('/inspection/answers', { params });
    return res.data;
};

export const getTrainProgress = async (trainId) => {
    const res = await api.get(`/pitline/train/${trainId}/progress`);
    return res.data;
};

export const getActivities = async (coachId, categoryName, subcategoryId = null) => {
    let url = `/activity-types?coach_id=${coachId}&category_name=${encodeURIComponent(categoryName)}`;
    if (subcategoryId) url += `&subcategory_id=${subcategoryId}`;
    const res = await api.get(url);
    return res.data;
};

export const getAmenitySubcategories = async (categoryName, coachId) => {
    const res = await api.get(`/amenity-subcategories`, { params: { category_name: categoryName, coach_id: coachId } });
    return res.data;
};

// --- WSP (New Architecture) ---
export const getWspSession = (coach_number) => api.get(`/wsp/session?coach_number=${coach_number}`).then(res => res.data);
export const getWspCoaches = () => api.get('/wsp/coaches').then(res => res.data);
export const createWspCoach = (data) => api.post('/wsp/coaches', data).then(res => res.data);
export const deleteWspCoach = (id) => api.delete(`/wsp/coaches/${id}`).then(res => res.data);
export const getWspSchedules = () => api.get('/wsp/schedules').then(res => res.data);
export const getWspQuestions = (scheduleId) => api.get(`/wsp/questions?schedule_id=${scheduleId}`).then(res => res.data);
export const getWspAnswers = (sessionId, mode, scheduleId) =>
    api.get('/wsp/answers', { params: { session_id: sessionId, mode, schedule_id: scheduleId } }).then(res => res.data);
export const saveWspAnswers = (data) => api.post('/wsp/save', data).then(res => res.data);
export const getWspProgress = (coachNumber, mode = 'INDEPENDENT') =>
    api.get('/wsp/progress', { params: { coach_number: coachNumber, mode } }).then(res => res.data);
export const completeWspSession = (session_id, mode) => api.post('/wsp/submit', { session_id, mode }).then(res => res.data);

// --- COMMON ENDPOINTS ---
export const getSubcategoryMetadata = (subId) =>
    api.get('/common/subcategory-metadata', { params: { subcategory_id: subId } }).then(res => res.data);

// --- COMMISSIONARY ENDPOINTS ---
export const getCommissionarySession = (coach_number, module_type = 'COMMISSIONARY') =>
    api.get(`/commissionary/session?coach_number=${coach_number}&module_type=${module_type}`).then(res => res.data);
export const getCommissionaryCoaches = () => api.get('/commissionary/coaches').then(res => res.data);
export const createCommissionaryCoach = (data) => api.post('/commissionary/coaches', data).then(res => res.data);
export const deleteCommissionaryCoach = (id) => api.delete(`/commissionary/coaches/${id}`).then(res => res.data);

export const getCommissionaryQuestions = (subId, actType, categoryName, module_type = 'COMMISSIONARY') =>
    api.get('/commissionary/questions', { params: { subcategory_id: subId, activity_type: actType, categoryName, module_type } }).then(r => r.data);

export const getCommissionaryAnswers = (sessionId, subId, actType, compartmentId, module_type = 'COMMISSIONARY') =>
    api.get('/commissionary/answers', { params: { session_id: sessionId, subcategory_id: subId, activity_type: actType, compartment_id: compartmentId, module_type } }).then(r => r.data);

export const saveCommissionaryAnswers = async (data) => {
    try {
        const isFormData = data instanceof FormData;

        const response = await api.post(
            'commissionary/save',
            data,
            isFormData
                ? {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    transformRequest: (formData) => formData,
                }
                : {}
        );

        return response.data;
    } catch (error) {
        console.log("SAVE API ERROR:", error.response?.data || error.message);
        throw error;
    }
};

export const getCommissionaryProgress = (coachNumber, module_type = 'COMMISSIONARY') =>
    api.get('/commissionary/progress', { params: { coach_number: coachNumber, module_type } }).then(r => r.data);

export const completeCommissionarySession = (coach_number, module_type = 'COMMISSIONARY') =>
    api.post('/commissionary/complete', { coach_number, module_type }).then(res => res.data);

export const submitCommissionarySession = (coach_number, submission_timestamp, module_type = 'COMMISSIONARY') =>
    api.post('/commissionary/submit', { coach_number, submission_timestamp, module_type }).then(res => res.data);

export const getCommissionaryCombinedReport = (sessionId, module_type = 'COMMISSIONARY') =>
    api.get('/commissionary/combined-report', { params: { session_id: sessionId, module_type } }).then(r => r.data);

// --- SICK LINE ENDPOINTS (Isolated) ---
export const getSickLineSession = (coach_number) => api.get(`/sickline/session?coach_number=${coach_number}`).then(res => res.data);
export const getSickLineCoaches = () => api.get('/sickline/coaches').then(res => res.data);
export const createSickLineCoach = (data) => api.post('/sickline/coaches', data).then(res => res.data);
export const deleteSickLineCoach = (id) => api.delete(`/sickline/coaches/${id}`).then(res => res.data);
export const getSickLineQuestions = (params = {}) =>
    api.get('/sickline/questions', { params }).then(r => r.data);

export const getSickLineAnswers = (sessionId) =>
    api.get('/sickline/answers', { params: { session_id: sessionId } }).then(r => r.data);

export const saveSickLineAnswers = async (data) => {
    try {
        const isFormData = data instanceof FormData;
        const response = await api.post(
            '/sickline/save',
            data,
            isFormData
            // ? {
            //     headers: { 'Content-Type': 'multipart/form-data' },
            //     transformRequest: (formData) => formData,
            // }
            // : {}
        );
        return response.data;
    } catch (error) {
        console.log("SICKLINE SAVE API ERROR:", error.response?.data || error.message);
        throw error;
    }
};

export const getSickLineProgress = (sessionId) =>
    api.get('/sickline/progress', { params: { session_id: sessionId } }).then(r => r.data);

export const completeSickLineSession = (coach_number) => api.post('/sickline/complete', { coach_number }).then(res => res.data);

export const getSickLineCombinedReport = (sessionId) =>
    api.get('/sickline/combined-report', { params: { session_id: sessionId } }).then(r => r.data);

export const getQuestions = async (activityId, scheduleId = null, subcategoryId = null, framework = null, activityType = null, categoryName = null) => {
    let url = `/checklist?`;
    if (scheduleId) {
        url += `schedule_id=${scheduleId}`;
    } else if (activityId) {
        url += `activity_id=${activityId}`;
    }
    if (subcategoryId) url += `&subcategory_id=${subcategoryId}`;
    if (framework) url += `&framework=${framework}`;
    if (activityType) url += `&activity_type=${activityType}`;
    if (categoryName) url += `&categoryName=${encodeURIComponent(categoryName)}`;
    const res = await api.get(url);
    return res.data;
};

export const submitPitlineSession = (session_id) =>
    api.post('/pitline/session/submit', { session_id }).then(res => res.data);

export const submitInspection = async (payload) => {
    const res = await api.post('/save-inspection', payload);
    return res.data;
};

export const getCombinedSummary = async (scheduleId, area) => {
    const res = await api.get(`/summary?schedule_id=${scheduleId}&area=${encodeURIComponent(area)}`);
    return res.data;
};

// --- Admin APIs ---

export const getAdminUsers = async () => {
    const res = await api.get('/admin/users');
    return res.data;
};

export const createAdminUser = async (userData) => {
    const res = await api.post('/admin/create-user', userData);
    return res.data;
};

export const updateAdminUser = async (userId, userData) => {
    const res = await api.put(`/admin/user/${userId}`, userData);
    return res.data;
};

export const updateAdminUserCategories = async (userId, categoryIds) => {
    const res = await api.put(`/admin/user-categories/${userId}`, { category_ids: categoryIds });
    return res.data;
};

export const deleteAdminUser = async (userId) => {
    const res = await api.delete(`/admin/user/${userId}`);
    return res.data;
};

export const getAdminMetadata = async () => {
    const res = await api.get('/admin/metadata');
    return res.data;
};

// Question Management APIs
export const getQuestionsByActivity = async (activityId, moduleType = null, subcategoryId = null, scheduleId = null, categoryName = null) => {
    let url = `/questions?`;
    if (activityId) url += `activity_id=${activityId}&`;
    if (moduleType) url += `module_type=${moduleType}&`;
    if (subcategoryId) url += `subcategory_id=${subcategoryId}&`;
    if (scheduleId) url += `schedule_id=${scheduleId}&`;
    if (categoryName) url += `categoryName=${encodeURIComponent(categoryName)}&`;
    const res = await api.get(url.endsWith('&') ? url.slice(0, -1) : url);
    return res.data;
};

export const createQuestion = async (questionData) => {
    const res = await api.post('/admin/question', questionData);
    return res.data;
};

export const updateQuestion = async (questionId, questionData) => {
    const res = await api.put(`/admin/question/${questionId}`, questionData);
    return res.data;
};

export const deleteQuestion = async (questionId) => {
    const res = await api.delete(`/admin/question/${questionId}`);
    return res.data;
};

// Reason Management APIs
export const getReasonsByQuestion = async (questionId) => {
    const res = await api.get(`/reasons?question_id=${questionId}`);
    return res.data;
};

export const createReason = async (reasonData) => {
    // reasonData should contain { question_id, text }
    const res = await api.post('/admin/reason', reasonData);
    return res.data;
};

export const updateReason = async (reasonId, reasonData) => {
    const res = await api.put(`/admin/reason/${reasonId}`, reasonData);
    return res.data;
};

export const deleteReason = async (reasonId) => {
    const res = await api.delete(`/admin/reason/${reasonId}`);
    return res.data;
};

// Report APIs
export const getReports = async (filters = {}) => {
    const res = await api.get('/reports', { params: filters });
    return res.data;
};

export const getReportFilterOptions = async () => {
    const res = await api.get('/report-filters');
    return res.data;
};

export const getReportDetails = async (params) => {
    // params: { train_number, coach_number, date, user_id }
    const res = await api.get('/report-details', { params });
    return res.data;
};

export const getCombinedReport = async (params) => {
    // params: { coach_id, subcategory_id, activity_type, date }
    const res = await api.get('/reports/combined', { params });
    return res.data;
};

export const getDefects = (params) => api.get('/inspection/defects', { params }).then(res => res.data);
export const resolveDefect = async (defectId, moduleType, remark, imageUri) => {
    try {
        let uploadedPhotoUrl = null;

        // The user noted that the initial photo upload ALWAYS works.
        // We will reuse that exact working method here.
        if (imageUri) {
            console.log(`[RESOLVE] Uploading photo first via proven uploadPhoto API...`);
            uploadedPhotoUrl = await uploadPhoto(imageUri);

            if (!uploadedPhotoUrl) {
                throw new Error("Failed to upload the photo to the server.");
            }
        }

        const payload = {
            answer_id: defectId,
            type: moduleType || "GENERIC",
            resolution_remark: remark || "",
            photo_url: uploadedPhotoUrl
        };

        // Now send standard JSON, completely avoiding React Native multipart bugs
        const endpoint = `/inspection/resolve`;
        console.log(`[RESOLVE] Attempting POST to: ${BASE_URL}${endpoint} with payload`, payload);

        const response = await api.post(endpoint, payload);

        console.log(`[RESOLVE] Response:`, response.status, response.data);
        return response.data;
    } catch (error) {
        console.error("Resolve defect error:", error.message);
        throw error;
    }
};

// --- UNIVERSAL AUTO-SAVE & CHECKPOINT ---

/**
 * Upload a local photo URI to the server and get back a server-hosted URL.
 * This must be called BEFORE autosave for any module that needs images visible on the dashboard.
 * @param {string} localUri - Local file:// or content:// URI from device camera/gallery
 * @returns {string} Server-hosted URL like /uploads/photo-12345.jpeg
 */
export const uploadPhoto = async (localUri) => {
    if (!localUri) return null;

    if (localUri.startsWith('http') || localUri.startsWith('/uploads/')) {
        return localUri;
    }

    const token = await SecureStore.getItemAsync('user_token');

    // Fallback if Android stripped file://
    const formattedUri = Platform.OS === 'android' && !localUri.startsWith('file://') && !localUri.startsWith('content://')
        ? `file://${localUri}`
        : localUri;

    console.log('[UPLOAD] Uploading photo via FileSystem:', formattedUri);

    try {
        const response = await FileSystem.uploadAsync(
            `${BASE_URL}/upload-photo`,
            formattedUri,
            {
                fieldName: 'photo',
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = JSON.parse(response.body);

        if (response.status !== 200 || !data.success) {
            throw new Error(data?.error || `Upload failed with status ${response.status}`);
        }

        console.log('[UPLOAD SUCCESS]', data);
        return data.photo_url;
    } catch (error) {
        console.error('[UPLOAD ERROR FILE SYSTEM]', error);
        throw error;
    }
};

export const autosaveInspection = async (payload) => {
    // Optional: handle photo upload if needed (already in your version)
    if (payload.photo_url && (payload.photo_url.startsWith('file://') || payload.photo_url.startsWith('content://'))) {
        try {
            const uploaded = await uploadPhoto(payload.photo_url);
            if (uploaded) payload.photo_url = uploaded;
        } catch (e) {
            console.warn('[AUTOSAVE] Photo upload failed, continuing without');
        }
    }

    console.log('[AUTOSAVE PAYLOAD]', payload);

    const res = await api.post('/inspection/autosave', payload);
    return res.data;
};

export const saveInspectionCheckpoint = async (payload) => {
    const res = await api.post('/inspection/save-checkpoint', payload);
    return res.data;
};

export const submitSickLineInspection = (sessionId) =>
    api.post('/sickline/submit', { session_id: sessionId }).then(res => res.data);

// --- CAI / MODIFICATIONS ENDPOINTS ---
export const getCaiQuestions = () => api.get('/cai/questions').then(res => res.data);
export const getCaiProgress = (coachNumber) => api.get('/cai/progress', { params: { coach_number: coachNumber } }).then(res => res.data);
export const getCaiAnswers = (sessionId) => api.get('/cai/answers', { params: { session_id: sessionId } }).then(res => res.data);
export const startCaiSession = (coachId) => api.post('/cai/session/start', { coach_id: coachId }).then(res => res.data);
export const submitCaiSession = (sessionId) => api.post('/cai/submit', { session_id: sessionId }).then(res => res.data);
export const getCaiCoaches = () => api.get('/cai/coaches').then(res => res.data);
export const createCaiCoach = (data) => api.post('/cai/coaches', data).then(res => res.data);
export const deleteCaiCoach = (id) => api.delete(`/cai/coaches/${id}`).then(res => res.data);

// Admin
export const addCaiQuestion = (data) => api.post('/cai/questions/add', data).then(res => res.data);
export const updateCaiQuestion = (data) => api.post('/cai/questions/update', data).then(res => res.data);

// --- PITLINE ENDPOINTS ---
export const getPitLineTrains = () => api.get('/pitline/trains').then(res => res.data);
export const createPitLineTrain = (data) => api.post('/pitline/trains/add', data).then(res => res.data);
export const deletePitLineTrain = (id) => api.delete(`/pitline/trains/${id}`).then(res => res.data);
export const getPitLineCoaches = (trainId) => api.get(`/pitline/coaches?train_id=${trainId}`).then(res => res.data);
export const addPitLineCoach = (data) => api.post('/pitline/coaches/add', data).then(res => res.data);
export const deletePitLineCoach = (id) => api.delete(`/pitline/coaches/${id}`).then(res => res.data);

export default api;
