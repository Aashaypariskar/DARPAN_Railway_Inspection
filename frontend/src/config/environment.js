const CONFIGS = {
    production: {
        BASE_URL: 'https://darpan.premade.in/api',
        FALLBACK_URL: 'https://railway-inspection-181711399428.us-central1.run.app/api'
    },
    staging: {
        BASE_URL: 'https://uatdarpan.premade.in/api'
    },
    development: {
        BASE_URL: 'http://192.168.1.4:8082/api'
    }
};

// 🔥 SAFE DEFAULT = production
const mode = (process.env.EXPO_PUBLIC_ENV || 'development').toLowerCase();

if (!CONFIGS[mode]) {
    throw new Error(`[ENV ERROR] Invalid environment: ${mode}`);
}

const activeConfig = CONFIGS[mode];

export const ENV_NAME = mode;
export const BASE_URL = activeConfig.BASE_URL;
export const PROD_URLS = [
    CONFIGS.production.BASE_URL,
    CONFIGS.production.FALLBACK_URL
];

console.log(`
====================================
ENVIRONMENT : ${ENV_NAME}
API URL     : ${BASE_URL}
====================================
`);