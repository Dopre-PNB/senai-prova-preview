const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produto = sequelize.define('Produto', {
  nome: { type: DataTypes.STRING, allowNull: false },
  descricao: { type: DataTypes.STRING, allowNull: false },
  quantidade_estoque: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { isInt: true, min: 0 },
  },
}, { paranoid: true });

module.exports = Produto;
