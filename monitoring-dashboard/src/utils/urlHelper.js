/**
 * URL Helper (FINAL VERSION)
 * - Uses VITE env (single source of truth)
 * - No hostname-based detection
 * - Supports images + socket
 */

// 🔐 Base API URL from Vite env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🚨 Safety check
if (!API_BASE_URL) {
    throw new Error("[ENV ERROR] VITE_API_BASE_URL is not defined");
}

/**
 * Export API base (if ever needed)
 */
export { API_BASE_URL };

/**
 * Get server base URL (remove /api)
 * Example:
 * http://localhost:8080/api → http://localhost:8080
 */
export const getServerBaseUrl = () => {
    return API_BASE_URL.replace(/\/api$/, '');
};

/**
 * Get initial image (before inspection)
 */
export const getInitialImage = (d) => {
    if (!d) return null;

    const path = d.photo_url || d.image_path || d.before_photo_url;
    if (!path) return null;

    return buildImageUrl(path);
};

/**
 * Get resolved image (after inspection)
 */
export const getResolvedImage = (d) => {
    if (!d) return null;

    const path = d.after_photo_url || d.resolved_image_path;
    if (!path) return null;

    return buildImageUrl(path);
};

/**
 * Generic image URL builder
 */
export const buildImageUrl = (path) => {
    if (!path) return null;

    // Already full URL
    if (path.startsWith("http")) return path;

    const base = getServerBaseUrl();

    // Remove leading slash to avoid double slashes
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

    return `${base}/${cleanPath}`;
};