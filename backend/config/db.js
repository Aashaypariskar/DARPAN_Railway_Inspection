const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// 🚨 STEP 1: FORCE NODE_ENV
const env = process.env.NODE_ENV;
if (!env) {
    console.error('[DB FATAL] NODE_ENV is not set. Use npm scripts (dev/staging/prod).');
    process.exit(1);
}

// 📂 STEP 2: LOAD CORRECT ENV FILE
const envPath = path.resolve(__dirname, `../.env.${env}`);
dotenv.config({ path: envPath, override: true });

console.log(`[DB INIT] Environment: ${env}`);

// 🔐 STEP 3: LOAD ENV VARIABLES
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const DB_DIALECT = process.env.DB_DIALECT || 'mysql';
const USE_SQLITE = process.env.USE_SQLITE === 'true';

// 🚨 STEP 4: VALIDATE REQUIRED CONFIG
if (!USE_SQLITE) {
    if (!DB_NAME || !DB_USER || !DB_PASS || !DB_HOST) {
        console.error('[DB FATAL] Missing DB credentials');
        process.exit(1);
    }
}

// 🚨 STEP 5: ENV ↔ DB SAFETY LOCK
if (env === 'production' && DB_NAME !== 'inspection_db') {
    console.error('[DB FATAL] Production must use inspection_db');
    process.exit(1);
}

if ((env === 'development' || env === 'staging') && DB_NAME !== 'inspection_staging') {
    console.error('[DB FATAL] Dev/Staging must use inspection_staging');
    process.exit(1);
}

// 🚨 STEP 6: BLOCK SQLITE IN PRODUCTION
if (env === 'production' && USE_SQLITE) {
    console.error('[DB FATAL] SQLite is NOT allowed in production');
    process.exit(1);
}

// 🔍 STEP 7: LOG ACTIVE CONFIG
console.log(`
====================================
ENVIRONMENT : ${env}
DATABASE    : ${USE_SQLITE ? 'SQLite' : DB_NAME}
HOST        : ${USE_SQLITE ? 'local' : DB_HOST}
====================================
`);

let sequelize;

// 🟢 STEP 8: SQLITE (DEV ONLY)
if (USE_SQLITE) {
    console.log('[DB INIT] Using SQLite fallback');

    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.SQLITE_STORAGE || 'database.sqlite',
        logging: false
    });

} else {
    // 🔵 STEP 9: MYSQL CONNECTION
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST,
        dialect: DB_DIALECT,
        port: DB_PORT,
        logging: false,
        pool: {
            max: 20,
            min: 2,
            acquire: 60000,
            idle: 10000
        },
        dialectOptions: {
            connectTimeout: 60000
        }
    });
}

module.exports = sequelize;