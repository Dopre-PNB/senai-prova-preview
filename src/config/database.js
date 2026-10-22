require('dotenv').config({ quiet: true });
const { Sequelize } = require('sequelize');

module.exports = new Sequelize(
  process.env.DB_NAME || 'prova_preview',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
  },
);
