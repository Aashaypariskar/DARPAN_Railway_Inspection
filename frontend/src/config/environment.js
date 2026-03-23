/**
 * Environment Configuration
 * SAFE + EXPLICIT (No auto-detection bugs)
 */

const CONFIGS = {
    production: {
        BASE_URL: 'https://darpan.premade.in/api',
        FALLBACK_URL: 'https://railway-inspection-181711399428.us-central1.run.app/api'
    },
    staging: {
        BASE_URL: 'https://uatdarpan.premade.com/api'
    },
    development: {
        BASE_URL: 'http://192.168.1.4:8080/api'
    }
};

// 🚨 STEP 1: FORCE ENV (NO AUTO-DETECTION)
const mode = (process.env.EXPO_PUBLIC_ENV || 'development').toLowerCase();

// 🚨 STEP 2: VALIDATE ENV
if (!CONFIGS[mode]) {
    throw new Error(`[ENV ERROR] Invalid environment: ${mode}`);
}

const activeConfig = CONFIGS[mode];

// 🔍 STEP 3: EXPORT VALUES
export const ENV_NAME = mode;
export const BASE_URL = activeConfig.BASE_URL;
export const PROD_URLS = [
    CONFIGS.production.BASE_URL,
    CONFIGS.production.FALLBACK_URL
];

// 🔥 STEP 4: LOG FOR DEBUGGING
console.log(`
====================================
ENVIRONMENT : ${ENV_NAME}
API URL     : ${BASE_URL}
====================================
`);