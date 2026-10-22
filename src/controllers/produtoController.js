const service = require('../services/produtoService');
async function cadastrar(req, res) { res.status(201).json(await service.cadastrar(req.body || {})); }
async function listar(req, res) { res.json(await service.listar(req.query)); }
async function atualizar(req, res) { res.json(await service.atualizar(req.params.id, req.body || {})); }
async function deletar(req, res) { res.json(await service.deletar(req.params.id)); }
module.exports = { cadastrar, listar, atualizar, deletar };
