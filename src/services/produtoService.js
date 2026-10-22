const { Op } = require('sequelize');
const Produto = require('../models/Produto');
const { falhar, texto, inteiroPositivo } = require('./validacao');

async function cadastrar(dados) {
  const nome = texto(dados.nome, 'Nome');
  const descricao = texto(dados.descricao, 'Descrição');
  const quantidade = dados.quantidade_estoque === undefined ? 0 : dados.quantidade_estoque;
  if (!Number.isSafeInteger(quantidade) || quantidade < 0 || quantidade > 2147483647) {
    falhar(400, 'Estoque inicial deve ser um número inteiro não negativo');
  }
  return Produto.create({ nome, descricao, quantidade_estoque: quantidade });
}

async function listar(query) {
  const pagina = inteiroPositivo(Number(query.pagina ?? 1), 'Página');
  const limite = inteiroPositivo(Number(query.limite ?? 10), 'Limite');
  if (limite > 100) falhar(400, 'Limite máximo de 100 produtos por página');
  const where = {};
  if (query.nome !== undefined) {
    if (typeof query.nome !== 'string') falhar(400, 'Filtro de nome inválido');
    if (query.nome.trim()) where.nome = { [Op.like]: `%${query.nome.trim()}%` };
  }
  if (query.data !== undefined && query.data !== '') {
    const data = typeof query.data === 'string' ? new Date(query.data) : null;
    if (!data || Number.isNaN(data.getTime())) falhar(400, 'Filtro de data inválido');
    where.createdAt = { [Op.gte]: data };
  }
  return Produto.findAll({ where, limit: limite, offset: (pagina - 1) * limite, order: [['id', 'ASC']] });
}

async function atualizar(idRecebido, dados) {
  const id = inteiroPositivo(Number(idRecebido), 'ID do produto');
  const produto = await Produto.findByPk(id);
  if (!produto) falhar(404, 'Produto não encontrado');
  if (dados.quantidade_estoque !== undefined) falhar(400, 'Atualize o estoque registrando uma movimentação');
  const alteracoes = {};
  if (dados.nome !== undefined) alteracoes.nome = texto(dados.nome, 'Nome');
  if (dados.descricao !== undefined) alteracoes.descricao = texto(dados.descricao, 'Descrição');
  return produto.update(alteracoes);
}

async function deletar(idRecebido) {
  const id = inteiroPositivo(Number(idRecebido), 'ID do produto');
  const produto = await Produto.findByPk(id);
  if (!produto) falhar(404, 'Produto não encontrado');
  await produto.destroy();
  return { mensagem: 'Produto removido com sucesso' };
}

module.exports = { cadastrar, listar, atualizar, deletar };
