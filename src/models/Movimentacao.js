const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Produto = require('./Produto');
const Usuario = require('./Usuario');

const Movimentacao = sequelize.define('Movimentacao', {
  tipo: { type: DataTypes.ENUM('entrada', 'saida'), allowNull: false },
  quantidade: { type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } },
  data: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
});

Produto.hasMany(Movimentacao, { foreignKey: { name: 'produto_id', allowNull: false } });
Movimentacao.belongsTo(Produto, { foreignKey: { name: 'produto_id', allowNull: false } });
Usuario.hasMany(Movimentacao, { foreignKey: { name: 'usuario_id', allowNull: false } });
Movimentacao.belongsTo(Usuario, { foreignKey: { name: 'usuario_id', allowNull: false } });

module.exports = Movimentacao;
