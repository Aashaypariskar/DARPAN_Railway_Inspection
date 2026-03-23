import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file based on mode
    const env = loadEnv(mode, process.cwd(), '');

    console.log(`
====================================
VITE MODE   : ${mode}
API URL     : ${env.VITE_API_BASE_URL}
====================================
`);

    return {
        plugins: [react()],

        base: '/',

        server: {
            port: 3001,

            // 🔥 DEV PROXY (IMPORTANT)
            proxy: mode === 'development' ? {
                '/api': {
                    target: env.VITE_API_BASE_URL,
                    changeOrigin: true,
                    secure: false
                }
            } : undefined
        },

        define: {
            __APP_ENV__: JSON.stringify(mode)
        }
    };
});