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

        BASE_URL: 'http://10.178.240.216:8080/api',
        NAME: 'development'
    }
};

// Force production if EXPO_PUBLIC_ENV is set, otherwise use NODE_ENV or __DEV__
const envMode = process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || (__DEV__ ? 'development' : 'production');
const mode = envMode === 'staging' ? 'staging' : (envMode === 'production' ? 'production' : 'development');
const activeConfig = CONFIGS[mode];

export const IS_DEV = mode === 'development';
export const BASE_URL = activeConfig.BASE_URL;
export const ENV_NAME = activeConfig.NAME;
export const PROD_URLS = [CONFIGS.production.BASE_URL, CONFIGS.production.FALLBACK_URL];

console.log(`[ENV] ${ENV_NAME} | BASE_URL: ${BASE_URL}`);
