require('dotenv').config({ quiet: true });
const sequelize = require('../src/config/database');
const Usuario = require('../src/models/Usuario');
require('../src/models/Movimentacao');
const usuarioService = require('../src/services/usuarioService');

async function executar() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email || !process.env.ADMIN_SENHA || process.env.ADMIN_SENHA === 'defina_uma_senha') {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_SENHA no .env antes de criar o administrador');
  }
  await sequelize.authenticate();
  await sequelize.sync();
  if (await Usuario.findOne({ where: { email } })) {
    throw new Error('Email já cadastrado; use outro email');
  }
  await usuarioService.cadastrar({ nome: process.env.ADMIN_NOME || 'Administrador', email, senha: process.env.ADMIN_SENHA }, 'administrador');
  console.log('Administrador cadastrado.');
}
executar().catch(erro => { console.error(erro.message); process.exitCode = 1; }).finally(() => sequelize.close());
