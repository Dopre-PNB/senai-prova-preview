const usuarioService = require('../services/usuarioService');

async function cadastrar(req, res) {
  res.status(201).json(await usuarioService.cadastrar(req.body || {}));
}
async function listar(req, res) { res.json(await usuarioService.listar()); }
async function atual(req, res) { res.json(req.usuario); }
async function atualizar(req, res) {
  res.json(await usuarioService.atualizar(req.params.id, req.body || {}, req.usuario));
}
async function deletar(req, res) {
  res.json(await usuarioService.deletar(req.params.id, req.usuario));
}

module.exports = { cadastrar, listar, atual, atualizar, deletar };
