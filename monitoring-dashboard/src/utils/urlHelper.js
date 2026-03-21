/**
 * Utility to dynamically determine the backend API URL based on the current environment.
 * Implementation follows environment isolation requirements:
 * - Localhost or 127.0.0.1 -> Development API
 * - Hostname contains "staging" -> Staging API
 * - Otherwise -> Production API
 */

export const getApiBaseUrl = () => {
    const { hostname } = window.location;

    // Development Environment
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return `http://${hostname}:8080/api`;
    }

    // Staging Environment
    if (hostname.toLowerCase().includes('staging') || hostname.toLowerCase().includes('uatdarpan')) {
        return 'https://uatdarpan.premade.com/api';
    }

    // Production Environment (Default)
    return 'https://darpan.premade.in/api';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Image Helpers for Dashboard
 */
export const getInitialImage = (d) => {
    if (!d) return null;
    const path = d.photo_url || d.image_path || d.before_photo_url;
    if (!path) return null;
    
    // Construct base URL from API_BASE_URL (removing /api)
    const base = API_BASE_URL.replace('/api', '');
    return `${base}/${path}`;
};

export const getResolvedImage = (d) => {
    if (!d) return null;
    const path = d.after_photo_url || d.resolved_image_path;
    if (!path) return null;

    const base = API_BASE_URL.replace('/api', '');
    return `${base}/${path}`;
};

export const getServerBaseUrl = () => API_BASE_URL.replace('/api', '');

export const buildImageUrl = (path) => {
    if (!path) return null;
    const base = getServerBaseUrl();
    if (path.startsWith('http')) return path;
    return `${base}/${path}`;
};
