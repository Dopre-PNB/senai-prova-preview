const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { falhar } = require('./validacao');

async function login({ email, senha }) {
  if (typeof email !== 'string' || typeof senha !== 'string') falhar(401, 'Email ou senha inválidos');
  const usuario = await Usuario.findOne({ where: { email: email.trim().toLowerCase() } });
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) falhar(401, 'Email ou senha inválidos');
  const token = jwt.sign({ id: usuario.id, tipo: usuario.tipo }, process.env.JWT_SECRET, { expiresIn: '8h' });
  return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo } };
}

module.exports = { login };
