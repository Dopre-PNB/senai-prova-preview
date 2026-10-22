const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

async function autenticar(req, res, next) {
  const partes = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
  if (!partes) return res.status(401).json({ mensagem: 'Token não enviado ou inválido' });
  let dados;
  try {
    dados = jwt.verify(partes[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
  }
  const usuario = await Usuario.findByPk(dados.id, { attributes: ['id', 'nome', 'email', 'tipo'] });
  if (!usuario) return res.status(401).json({ mensagem: 'Usuário não encontrado' });
  req.usuario = usuario.toJSON();
  return next();
}

module.exports = autenticar;
