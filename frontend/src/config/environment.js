/**
 * Environment Configuration
 * Centralized API endpoints for Development, Staging, and Production.
 */

const CONFIGS = {
    production: {
        BASE_URL: 'https://darpan.premade.in/api',
        FALLBACK_URL: 'https://railway-inspection-181711399428.us-central1.run.app/api',
        NAME: 'production'
    },
    staging: {
        BASE_URL: 'https://uatdarpan.premade.com/api',
        NAME: 'staging'
    },
    development: {
        // BASE_URL: 'http://192.168.1.2:8080/api',

        BASE_URL: 'http://10.0.2.2:8081/api',
        NAME: 'development'
    }
};

// Determine requested env from explicit env vars
const envModeRaw = String(process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || '').trim().toLowerCase();

// If running in React Native dev mode, force development.
// Also in web, if location host is local IP/localhost, force development.
let inferredMode = 'production';
if (typeof __DEV__ !== 'undefined' && __DEV__) {
    inferredMode = 'development';
} else if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
        inferredMode = 'development';
    }
}

const mode = envModeRaw === 'staging'
    ? 'staging'
    : envModeRaw === 'production'
    ? 'production'
    : inferredMode === 'development'
    ? 'development'
    : 'production';

const activeConfig = CONFIGS[mode];

export const IS_DEV = mode === 'development';
export const BASE_URL = activeConfig.BASE_URL;
export const ENV_NAME = activeConfig.NAME;
export const PROD_URLS = [CONFIGS.production.BASE_URL, CONFIGS.production.FALLBACK_URL];

console.log(`[ENV] ${ENV_NAME} | BASE_URL: ${BASE_URL}`);
