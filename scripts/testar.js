const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const raiz = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(raiz, '.env'), quiet: true });

const casos = [
  { id: 1, titulo: 'Saída acima do saldo', quantidade: 11, status: 400, saldo: 10,
    esperado: 'Bloquear a saída, informar disponível 10 e solicitado 11, manter saldo 10 e não criar movimentação.' },
  { id: 2, titulo: 'Saída abaixo do saldo', quantidade: 4, status: 201, saldo: 6,
    esperado: 'Registrar a saída de 4, atualizar o saldo para 6 e guardar data e responsável.' },
  { id: 3, titulo: 'Saída igual ao saldo', quantidade: 10, status: 201, saldo: 0,
    esperado: 'Registrar a saída de 10, atualizar o saldo para zero e guardar data e responsável.' },
];

let conexao, sequelize, servidor;

async function executar() {
  const arquivoPlano = path.join(raiz, 'docs', 'plano_testes.docx');
  const hashPlano = crypto.createHash('sha256').update(fs.readFileSync(arquivoPlano)).digest('hex');
  const banco = 'senai_estoque_preview_test_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
  const senha = crypto.randomBytes(18).toString('hex');

  conexao = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  await conexao.query('CREATE DATABASE `' + banco + '` CHARACTER SET utf8mb4');
  process.env.DB_NAME = banco;
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');

  const app = require('../src/app');
  sequelize = require('../src/config/database');
  const Usuario = require('../src/models/Usuario');
  const Produto = require('../src/models/Produto');
  const Movimentacao = require('../src/models/Movimentacao');
  await sequelize.sync();
  await Usuario.create({ nome: 'Administrador de teste', email: 'admin@teste.local',
    senha: await bcrypt.hash(senha, 10), tipo: 'administrador' });

  servidor = await new Promise(resolve => {
    const iniciado = app.listen(0, '127.0.0.1', () => resolve(iniciado));
  });
  const url = 'http://127.0.0.1:' + servidor.address().port;
  async function requisicao(rota, dados, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const resposta = await fetch(url + rota, { method: 'POST', headers, body: JSON.stringify(dados) });
    return { status: resposta.status, dados: await resposta.json() };
  }

  const loginAdmin = await requisicao('/login', { email: 'admin@teste.local', senha });
  assert.equal(loginAdmin.status, 200, 'Preparação: login do administrador');
  const cadastro = await requisicao('/usuarios', { nome: 'Operador de teste', email: 'operador@teste.local', senha }, loginAdmin.dados.token);
  assert.equal(cadastro.status, 201, 'Preparação: cadastro do operador');
  const operador = cadastro.dados;
  const login = await requisicao('/login', { email: 'operador@teste.local', senha });
  assert.equal(login.status, 200, 'Preparação: login do operador');

  const pasta = path.join(raiz, 'docs', 'testes');
  fs.mkdirSync(pasta, { recursive: true });
  let aprovados = 0;
  for (const caso of casos) {
    const produto = await Produto.create({ nome: 'Produto do cenário ' + caso.id,
      descricao: 'Produto fictício para teste', quantidade_estoque: 10 });
    const saldoAntes = (await Produto.findByPk(produto.id)).quantidade_estoque;
    const inicio = Date.now();
    const resposta = await requisicao('/movimentacoes', { produto_id: produto.id, tipo: 'saida', quantidade: caso.quantidade }, login.dados.token);
    const saldoDepois = (await Produto.findByPk(produto.id)).quantidade_estoque;
    const movimentos = (await Movimentacao.findAll({ where: { produto_id: produto.id },
      attributes: ['id', 'produto_id', 'usuario_id', 'tipo', 'quantidade', 'data'] })).map(item => item.toJSON());
    const evidencia = {
      id: caso.id,
      titulo: caso.titulo,
      dadosUsados: { produto_id: produto.id, saldo: 10, tipo: 'saida', quantidade: caso.quantidade, usuario_id: operador.id },
      esperado: caso.esperado,
      statusHTTP: resposta.status,
      resposta: resposta.dados,
      saldoAntes,
      saldoDepois,
      movimentacoes: movimentos,
      dataExecucao: new Date().toISOString(),
      fuso: 'America/Sao_Paulo',
      bancoTeste: banco,
      plano: { arquivo: 'docs/plano_testes.docx', sha256: hashPlano, lidoAntesDaExecucao: true },
    };
    try {
      assert.equal(resposta.status, caso.status);
      assert.equal(saldoAntes, 10);
      assert.equal(saldoDepois, caso.saldo);
      assert.equal(movimentos.length, caso.status === 201 ? 1 : 0);
      if (caso.status === 400) {
        assert.equal(resposta.dados.mensagem, 'Saída não permitida: estoque insuficiente. Disponível: 10. Solicitado: 11.');
      } else {
        assert.equal(resposta.dados.quantidade_estoque, caso.saldo);
        assert.equal(movimentos[0].quantidade, caso.quantidade);
        assert.equal(movimentos[0].tipo, 'saida');
        assert.equal(movimentos[0].usuario_id, operador.id);
        const data = new Date(movimentos[0].data).getTime();
        assert.ok(Number.isFinite(data) && data >= inicio - 2000 && data <= Date.now() + 2000, 'Data deve corresponder à execução');
      }
      evidencia.conclusao = 'Aprovado. Resultado obtido atende ao esperado.';
      aprovados++;
    } catch (erro) {
      evidencia.conclusao = 'Reprovado. ' + erro.message;
    }
    fs.writeFileSync(path.join(pasta, 'cenario' + caso.id + '.json'), JSON.stringify(evidencia, null, 2) + '\n');
    console.log('Cenário ' + caso.id + ': ' + evidencia.conclusao);
  }
  console.log(aprovados + ' de 3 cenários aprovados.');
  if (aprovados !== 3) process.exitCode = 1;
}

executar().catch(erro => {
  console.error('Não foi possível executar os testes:', erro.code || erro.message);
  process.exitCode = 1;
}).finally(async () => {
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  if (sequelize) await sequelize.close();
  if (conexao) await conexao.end();
});
