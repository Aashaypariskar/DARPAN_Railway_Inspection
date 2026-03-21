const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Determine which .env file to load
const env = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, `../.env.${env}`);

// Load the environment configuration
dotenv.config({ path: envPath, override: true });

console.log(`[DB INIT] Loading configuration for environment: ${env}`);
if (env === 'production') {
    console.warn('[DB WARNING] Connecting to PRODUCTION database');
}

// Use environment variables for credentials; enforce strict loading for security
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const DB_DIALECT = process.env.DB_DIALECT || 'mysql';

if (!DB_NAME || !DB_USER || !DB_PASS || !DB_HOST || !DB_PORT) {
    if (process.env.USE_SQLITE !== 'true') {
        console.error('[DB FATAL] Missing REQUIRED database credentials in environment variables.');
        console.error(`[DB DEBUG] Missing: ${[!DB_NAME && 'DB_NAME', !DB_USER && 'DB_USER', !DB_PASS && 'DB_PASS', !DB_HOST && 'DB_HOST', !DB_PORT && 'DB_PORT'].filter(Boolean).join(', ')}`);
        process.exit(1); 
    }
}

let sequelize;

// Optional: allow using a local SQLite DB for development to avoid remote network issues
if (process.env.USE_SQLITE === 'true') {
    console.log('[DB INIT] Using local SQLite fallback');
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.SQLITE_STORAGE || 'database.sqlite',
        logging: false
    });
} else {
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST,
        dialect: DB_DIALECT,
        logging: false,
        port: DB_PORT,
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
