const sequelize = require('../config/database');
const Produto = require('../models/Produto');
const Usuario = require('../models/Usuario');
const Movimentacao = require('../models/Movimentacao');
const { falhar, inteiroPositivo } = require('./validacao');

async function cadastrar(dados, usuario) {
  const produtoId = inteiroPositivo(dados.produto_id, 'ID do produto');
  const quantidade = inteiroPositivo(dados.quantidade, 'Quantidade');
  if (!['entrada', 'saida'].includes(dados.tipo)) falhar(400, 'Tipo de movimentação deve ser entrada ou saida');
  return sequelize.transaction(async (transaction) => {
    const produto = await Produto.findByPk(produtoId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!produto) falhar(404, 'Produto não encontrado');
    if (dados.tipo === 'saida' && produto.quantidade_estoque < quantidade) {
      falhar(400, `Saída não permitida: estoque insuficiente. Disponível: ${produto.quantidade_estoque}. Solicitado: ${quantidade}.`);
    }
    const saldo = dados.tipo === 'entrada' ? produto.quantidade_estoque + quantidade : produto.quantidade_estoque - quantidade;
    if (saldo > 2147483647) falhar(400, 'Estoque ultrapassa o limite permitido');
    await produto.update({ quantidade_estoque: saldo }, { transaction });
    const movimentacao = await Movimentacao.create({ produto_id: produtoId, usuario_id: usuario.id, tipo: dados.tipo, quantidade }, { transaction });
    return { ...movimentacao.toJSON(), quantidade_estoque: saldo };
  });
}

async function listar() {
  return Movimentacao.findAll({
    order: [['id', 'DESC']],
    include: [
      { model: Produto, attributes: ['id', 'nome'], paranoid: false },
      { model: Usuario, attributes: ['id', 'nome'] },
    ],
  });
}

module.exports = { cadastrar, listar };
