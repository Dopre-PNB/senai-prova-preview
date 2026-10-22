const usuarioService = require('../services/usuarioService');

async function cadastrar(req, res) {
  const dados = req.body || {};
  res.status(201).json(await usuarioService.cadastrar(dados, dados.tipo ?? 'operador'));
}

module.exports = { cadastrar };
