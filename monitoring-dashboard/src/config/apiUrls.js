// src/config/apiUrls.js

const URLS = [
    import.meta.env.VITE_API_BASE_URL,
    import.meta.env.VITE_API_FALLBACK_URL
].filter(Boolean);

if (!URLS.length) {
    throw new Error("[ENV ERROR] No API URLs configured");
}

let currentUrlIndex = 0;

// Get current active URL
export const getBaseUrl = () => {
    return URLS[currentUrlIndex];
};

// Switch to next URL (failover)
export const switchToNextUrl = () => {
    currentUrlIndex = (currentUrlIndex + 1) % URLS.length;

    console.warn(`
[API FAILOVER]
Switching to: ${URLS[currentUrlIndex]}
`);
};

// Debug helper
export const logApiConfig = () => {
    console.log(`
====================================
API URLS:
${URLS.join("\n")}
CURRENT INDEX: ${currentUrlIndex}
====================================
`);
};