const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');
const { falhar, texto } = require('./validacao');
const campos = ['id', 'nome', 'email', 'tipo'];

function emailValido(valor) {
  const email = texto(valor, 'Email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) falhar(400, 'Email inválido');
  return email;
}

async function senhaSegura(senha) {
  if (typeof senha !== 'string' || senha.length < 6 || senha.length > 72) {
    falhar(400, 'Senha deve ter entre 6 e 72 caracteres');
  }
  return bcrypt.hash(senha, 10);
}

function semSenha(usuario) {
  return Object.fromEntries(campos.map(campo => [campo, usuario[campo]]));
}

async function cadastrar(dados, tipo = 'operador') {
  if (!['administrador', 'operador'].includes(tipo)) falhar(400, 'Perfil inválido');
  const usuario = await Usuario.create({
    nome: texto(dados.nome, 'Nome'),
    email: emailValido(dados.email),
    senha: await senhaSegura(dados.senha),
    tipo,
  });
  return semSenha(usuario);
}

module.exports = { cadastrar };
