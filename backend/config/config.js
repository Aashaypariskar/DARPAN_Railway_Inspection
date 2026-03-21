const dotenv = require('dotenv');
const path = require('path');

// Determine environment
const env = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, `../.env.${env}`);

// Load the environment configuration
dotenv.config({ path: envPath });

const config = {
  username: process.env.DB_USER || 'railway_user',
  password: process.env.DB_PASS || 'Railway@123',
  database: process.env.DB_NAME || 'inspection_db',
  host: process.env.DB_HOST || '3.110.16.111',
  port: process.env.DB_PORT || 3307,
  dialect: process.env.DB_DIALECT || 'mysql',
  logging: false
};

module.exports = {
  development: config,
  test: config,
  staging: config,
  production: config
};
