import axios from "axios";

const URLS = [
    import.meta.env.VITE_API_BASE_URL,
    import.meta.env.VITE_API_FALLBACK_URL
].filter(Boolean);

if (!URLS.length) {
    throw new Error("[ENV ERROR] No API URLs configured");
}

let currentUrlIndex = 0;

const api = axios.create({
    baseURL: URLS[currentUrlIndex],
    timeout: 15000
});

console.log("API URLs:", URLS);

// 🔐 REQUEST INTERCEPTOR (AUTH)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// 🔁 RESPONSE INTERCEPTOR (FAILOVER + AUTH)
let isRedirecting = false;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 🔁 FAILOVER LOGIC
        if ((!error.response || error.response.status >= 500) && URLS.length > 1) {
            if (!originalRequest._retryCount) originalRequest._retryCount = 0;

            if (originalRequest._retryCount < URLS.length - 1) {
                originalRequest._retryCount++;

                currentUrlIndex = (currentUrlIndex + 1) % URLS.length;
                const newUrl = URLS[currentUrlIndex];

                api.defaults.baseURL = newUrl;
                originalRequest.baseURL = newUrl;

                console.warn(`[API FAILOVER] Switching to: ${newUrl}`);

                return api(originalRequest);
            }
        }

        // 🔐 AUTH FAILURE
        if (error.response?.status === 401 && !isRedirecting) {
            isRedirecting = true;

            console.warn("[AUTH] Session expired");

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.href = "/login?message=session_expired";

            setTimeout(() => {
                isRedirecting = false;
            }, 5000);
        }

        return Promise.reject(error);
    }
);

export default api;