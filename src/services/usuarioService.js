const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');
const { falhar, texto, inteiroPositivo } = require('./validacao');
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
  const usuario = await Usuario.create({
    nome: texto(dados.nome, 'Nome'),
    email: emailValido(dados.email),
    senha: await senhaSegura(dados.senha),
    tipo,
  });
  return semSenha(usuario);
}

async function listar() {
  return Usuario.findAll({ attributes: campos, order: [['id', 'ASC']] });
}

async function atualizar(idRecebido, dados, responsavel) {
  const id = inteiroPositivo(Number(idRecebido), 'ID do usuário');
  if (responsavel.tipo !== 'administrador' && responsavel.id !== id) falhar(403, 'Sem permissão para essa ação');
  const usuario = await Usuario.findByPk(id);
  if (!usuario) falhar(404, 'Usuário não encontrado');
  const alteracoes = {};
  if (dados.nome !== undefined) alteracoes.nome = texto(dados.nome, 'Nome');
  if (dados.email !== undefined) alteracoes.email = emailValido(dados.email);
  if (dados.senha !== undefined) alteracoes.senha = await senhaSegura(dados.senha);
  if (dados.tipo !== undefined) {
    if (responsavel.tipo !== 'administrador') falhar(403, 'Somente o administrador pode alterar perfis');
    if (!['administrador', 'operador'].includes(dados.tipo)) falhar(400, 'Perfil inválido');
    if (id === responsavel.id && dados.tipo !== 'administrador') falhar(400, 'Não é possível remover seu próprio acesso de administrador');
    alteracoes.tipo = dados.tipo;
  }
  await usuario.update(alteracoes);
  return semSenha(usuario);
}

async function deletar(idRecebido, responsavel) {
  const id = inteiroPositivo(Number(idRecebido), 'ID do usuário');
  if (id === responsavel.id) falhar(400, 'Não é possível excluir seu próprio usuário');
  const usuario = await Usuario.findByPk(id);
  if (!usuario) falhar(404, 'Usuário não encontrado');
  await usuario.destroy();
  return { mensagem: 'Usuário removido com sucesso' };
}

module.exports = { cadastrar, listar, atualizar, deletar };
