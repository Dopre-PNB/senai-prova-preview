const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const raiz = path.resolve(__dirname, '..');
const planoArquivo = path.join(raiz, 'docs', 'casos.json');
const textoPlano = fs.readFileSync(planoArquivo, 'utf8');
const plano = JSON.parse(textoPlano);
const pasta = path.join(raiz, 'docs', 'testes');
const senha = crypto.randomBytes(18).toString('hex');
const banco = 'senai_estoque_preview_test_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
const relatorio = {
  titulo: plano.titulo,
  inicio: new Date().toISOString(),
  fuso: 'America/Sao_Paulo',
  metodo: 'Requisições HTTP reais e conferência no MySQL; dados fictícios em banco isolado.',
  plano: { arquivo: 'docs/casos.json', sha256: crypto.createHash('sha256').update(textoPlano).digest('hex'), lidoAntesDaExecucao: true },
  ambiente: { node: process.version, bancoTeste: banco, bancoAplicacao: process.env.DB_NAME || 'prova_preview' },
  casos: [],
};
let conexao, sequelize, servidor, url, Usuario, Produto, Movimentacao, operador, admin, tokenOperador, tokenAdmin, atual;

function seguro(valor) {
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map(seguro);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave,
      /^(senha|password|token|authorization|secret|jwt_secret|db_password)$/i.test(chave) ? '[omitido]' : seguro(item)]));
  }
  if (typeof valor === 'string') {
    for (const segredo of [senha, process.env.DB_PASSWORD, process.env.JWT_SECRET].filter(Boolean)) {
      valor = valor.split(segredo).join('[omitido]');
    }
  }
  return valor;
}
function evidencia(nome, dados) { atual.evidencias.push({ nome, dados: seguro(dados) }); }
async function chamada(metodo, rota, corpo, token = tokenOperador) {
  const headers = {};
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const resposta = await fetch(url + rota, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  const dados = await resposta.json();
  evidencia('HTTP', { metodo, rota, corpo, status: resposta.status, resposta: dados });
  return { status: resposta.status, dados };
}
async function produto(saldo = 10, nome = 'Material de teste', campos = {}) {
  return Produto.create({ nome, descricao: 'Produto fictício para teste', quantidade_estoque: saldo, ...campos });
}
async function estado(id) {
  const material = await Produto.findByPk(id);
  const registros = await Movimentacao.findAll({ where: { produto_id: id }, order: [['id', 'ASC']] });
  return { saldo: material && material.quantidade_estoque, movimentacoes: registros.map(item => item.toJSON()) };
}
function conferirData(data, inicio) {
  const instante = Date.parse(data);
  assert.ok(Number.isFinite(instante) && instante >= inicio - 2000 && instante <= Date.now() + 2000, 'Data/hora deve corresponder à execução');
}
async function saida(quantidade, saldo, status, esperado) {
  const material = await produto(saldo);
  evidencia('Antes', await estado(material.id));
  const inicio = Date.now();
  const resposta = await chamada('POST', '/movimentacoes', { produto_id: material.id, tipo: 'saida', quantidade });
  const depois = await estado(material.id);
  evidencia('Depois (MySQL)', depois);
  assert.equal(resposta.status, status);
  assert.equal(depois.saldo, esperado);
  assert.equal(depois.movimentacoes.length, status === 201 ? 1 : 0);
  if (status === 201) {
    assert.equal(resposta.dados.quantidade_estoque, esperado);
    const registro = depois.movimentacoes[0];
    assert.equal(registro.quantidade, quantidade);
    assert.equal(registro.usuario_id, operador.id);
    assert.equal(registro.tipo, 'saida');
    conferirData(registro.data, inicio);
  } else if (quantidade > saldo) {
    assert.equal(resposta.dados.mensagem, `Saída não permitida: estoque insuficiente. Disponível: ${saldo}. Solicitado: ${quantidade}.`);
  }
}

const testes = {
  1: () => saida(11, 10, 400, 10),
  2: () => saida(4, 10, 201, 6),
  3: () => saida(10, 10, 201, 0),
  4: () => saida(1, 0, 400, 0),
  5: async () => {
    const resposta = await chamada('POST', '/usuarios', { nome: 'Cadastro de teste', email: 'cadastro@teste.local', senha, tipo: 'administrador' }, null);
    assert.equal(resposta.status, 201);
    assert.equal(resposta.dados.tipo, 'operador');
    assert.ok(!('senha' in resposta.dados));
    const usuario = await Usuario.findByPk(resposta.dados.id);
    assert.notEqual(usuario.senha, senha);
    assert.ok(await bcrypt.compare(senha, usuario.senha));
    evidencia('Banco', { id: usuario.id, tipo: usuario.tipo, hashBcryptConfere: true });
  },
  6: async () => {
    const login = await chamada('POST', '/login', { email: operador.email, senha }, null);
    assert.equal(login.status, 200);
    assert.equal(jwt.verify(login.dados.token, process.env.JWT_SECRET).id, operador.id);
    assert.ok(!('senha' in login.dados.usuario));
    const usuario = await chamada('GET', '/usuarios/me', undefined, login.dados.token);
    assert.equal(usuario.status, 200);
    assert.equal(usuario.dados.id, operador.id);
    assert.equal(usuario.dados.tipo, 'operador');
  },
  7: async () => {
    const resposta = await chamada('POST', '/login', { email: operador.email, senha: 'incorreta' }, null);
    assert.equal(resposta.status, 401);
    assert.ok(resposta.dados.mensagem);
    assert.ok(!resposta.dados.token);
  },
  8: async () => {
    const antes = await Produto.count();
    for (const rota of ['/produtos', '/usuarios', '/movimentacoes']) {
      assert.equal((await chamada('GET', rota, undefined, null)).status, 401);
    }
    assert.equal((await chamada('POST', '/produtos', { nome: 'Sem acesso', descricao: 'Teste' }, null)).status, 401);
    assert.equal(await Produto.count(), antes);
  },
  9: async () => {
    const expirado = jwt.sign({ id: operador.id }, process.env.JWT_SECRET, { expiresIn: -1 });
    for (const token of ['invalido', expirado]) assert.equal((await chamada('GET', '/produtos', undefined, token)).status, 401);
  },
  10: async () => {
    const material = await produto();
    assert.equal((await chamada('DELETE', '/produtos/' + material.id)).status, 403);
    assert.ok(await Produto.findByPk(material.id));
  },
  11: async () => {
    const material = await produto();
    const movimento = await chamada('POST', '/movimentacoes', { produto_id: material.id, tipo: 'saida', quantidade: 1 });
    assert.equal(movimento.status, 201);
    assert.equal((await chamada('DELETE', '/produtos/' + material.id, undefined, tokenAdmin)).status, 200);
    assert.equal(await Produto.findByPk(material.id), null);
    const guardado = await Produto.findByPk(material.id, { paranoid: false });
    assert.ok(guardado.deletedAt);
    const historico = await chamada('GET', '/movimentacoes');
    const registro = historico.dados.find(item => item.id === movimento.dados.id);
    assert.equal(registro.Produto.nome, material.nome);
    assert.equal(registro.Usuario.id, operador.id);
    assert.ok(registro.data);
    evidencia('Histórico preservado', { produtoExcluido: material.id, movimentacao: registro });
  },
  12: async () => {
    const criado = await chamada('POST', '/produtos', { nome: 'Produto novo', descricao: 'Descrição inicial', quantidade_estoque: 10 });
    assert.equal(criado.status, 201);
    const id = criado.dados.id;
    const editado = await chamada('PUT', '/produtos/' + id, { nome: 'Produto alterado', descricao: 'Nova descrição' });
    assert.equal(editado.status, 200);
    assert.equal(editado.dados.nome, 'Produto alterado');
    assert.equal(editado.dados.descricao, 'Nova descrição');
    assert.equal((await chamada('PUT', '/produtos/' + id, { quantidade_estoque: 99 })).status, 400);
    assert.equal((await estado(id)).saldo, 10);
  },
  13: async () => {
    const criado = await chamada('POST', '/usuarios', { nome: 'Usuário para gestão', email: 'gestao@teste.local', senha }, null);
    assert.equal(criado.status, 201);
    const id = criado.dados.id;
    assert.equal((await chamada('GET', '/usuarios', undefined, tokenAdmin)).status, 200);
    assert.equal((await chamada('GET', '/usuarios')).status, 403);
    const editado = await chamada('PUT', '/usuarios/' + id, { nome: 'Usuário alterado', tipo: 'administrador' }, tokenAdmin);
    assert.equal(editado.status, 200);
    assert.equal(editado.dados.tipo, 'administrador');
    const token = jwt.sign({ id, tipo: 'administrador' }, process.env.JWT_SECRET);
    assert.equal((await chamada('DELETE', '/usuarios/' + id, undefined, tokenAdmin)).status, 200);
    assert.equal((await chamada('GET', '/usuarios/me', undefined, token)).status, 401);
    assert.equal(await Usuario.findByPk(id), null);
  },
  14: async () => {
    assert.equal((await chamada('PUT', '/usuarios/' + operador.id, { tipo: 'administrador' })).status, 403);
    assert.equal((await chamada('PUT', '/usuarios/' + admin.id, { nome: 'Nome indevido' })).status, 403);
    assert.equal((await Usuario.findByPk(operador.id)).tipo, 'operador');
    assert.equal((await Usuario.findByPk(admin.id)).nome, admin.nome);
  },
  15: () => saida(0, 10, 400, 10),
  16: () => saida(-1, 10, 400, 10),
  17: () => saida(1.5, 10, 400, 10),
  18: async () => {
    const material = await produto();
    const inicio = Date.now();
    const resposta = await chamada('POST', '/movimentacoes', { produto_id: material.id, tipo: 'entrada', quantidade: 3 });
    const depois = await estado(material.id);
    evidencia('Depois (MySQL)', depois);
    assert.equal(resposta.status, 201);
    assert.equal(depois.saldo, 13);
    assert.equal(depois.movimentacoes.length, 1);
    assert.equal(depois.movimentacoes[0].tipo, 'entrada');
    assert.equal(depois.movimentacoes[0].usuario_id, operador.id);
    conferirData(depois.movimentacoes[0].data, inicio);
  },
  19: async () => {
    const material = await produto();
    assert.equal((await chamada('POST', '/movimentacoes', { produto_id: material.id, tipo: 'ajuste', quantidade: 1 })).status, 400);
    const depois = await estado(material.id);
    evidencia('Depois (MySQL)', depois);
    assert.equal(depois.saldo, 10);
    assert.equal(depois.movimentacoes.length, 0);
  },
  20: async () => {
    const antes = await Movimentacao.count();
    assert.equal((await chamada('POST', '/movimentacoes', { produto_id: 2147483647, tipo: 'saida', quantidade: 1 })).status, 404);
    assert.equal(await Movimentacao.count(), antes);
  },
  21: async () => {
    const ids = [];
    for (let i = 1; i <= 3; i++) ids.push((await produto(10, 'PaginaTeste ' + i)).id);
    const primeira = await chamada('GET', '/produtos?nome=PaginaTeste&pagina=1&limite=2');
    const segunda = await chamada('GET', '/produtos?nome=PaginaTeste&pagina=2&limite=2');
    assert.equal(primeira.status, 200);
    assert.equal(segunda.status, 200);
    assert.deepEqual(primeira.dados.map(item => item.id), ids.slice(0, 2));
    assert.deepEqual(segunda.dados.map(item => item.id), ids.slice(2));
  },
  22: async () => {
    const material = await produto(10, 'FiltroNome Sabão');
    await produto(10, 'FiltroNome Detergente');
    const resposta = await chamada('GET', '/produtos?nome=' + encodeURIComponent('FiltroNome Sabão'));
    assert.equal(resposta.status, 200);
    assert.deepEqual(resposta.dados.map(item => item.id), [material.id]);
  },
  23: async () => {
    await produto(10, 'FiltroData antigo', { createdAt: new Date('2020-01-01T12:00:00Z') });
    const recente = await produto(10, 'FiltroData recente', { createdAt: new Date('2026-06-01T12:00:00Z') });
    const resposta = await chamada('GET', '/produtos?nome=FiltroData&data=2026-01-01');
    assert.equal(resposta.status, 200);
    assert.deepEqual(resposta.dados.map(item => item.id), [recente.id]);
  },
  24: async () => {
    const material = await produto();
    const respostas = await Promise.all([1, 2].map(() => chamada('POST', '/movimentacoes', { produto_id: material.id, tipo: 'saida', quantidade: 7 })));
    const depois = await estado(material.id);
    evidencia('Depois (MySQL)', depois);
    assert.deepEqual(respostas.map(item => item.status).sort(), [201, 400]);
    assert.equal(depois.saldo, 3);
    assert.equal(depois.movimentacoes.length, 1);
  },
  25: async () => {
    const material = await produto();
    const resposta = await chamada('POST', '/movimentacoes', { produto_id: material.id, tipo: 'saida', quantidade: 1, usuario_id: admin.id });
    assert.equal(resposta.status, 201);
    const registro = await Movimentacao.findByPk(resposta.dados.id);
    assert.equal(registro.usuario_id, operador.id);
    evidencia('Responsável no MySQL', { id: registro.id, usuario_id: registro.usuario_id, operador: operador.id });
  },
  26: async () => {
    const resposta = await chamada('GET', '/movimentacoes');
    assert.equal(resposta.status, 200);
    assert.ok(resposta.dados.length > 0);
    for (const registro of resposta.dados) {
      assert.ok(registro.Produto && registro.Usuario && registro.data && registro.tipo && registro.quantidade > 0);
      assert.ok(!('senha' in registro.Usuario));
      assert.ok(!('token' in registro));
    }
  },
};

async function executar() {
  fs.mkdirSync(pasta, { recursive: true });
  try {
    assert.notEqual(banco, relatorio.ambiente.bancoAplicacao);
    if (!process.env.JWT_SECRET) throw new Error('Preencha JWT_SECRET no .env antes de executar');
    conexao = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
    await conexao.query('CREATE DATABASE `' + banco + '` CHARACTER SET utf8mb4');
    const [[versao]] = await conexao.query('SELECT VERSION() AS versao');
    relatorio.ambiente.mysql = versao.versao;
    process.env.DB_NAME = banco;
    const app = require('../src/app');
    sequelize = require('../src/config/database');
    Usuario = require('../src/models/Usuario');
    Produto = require('../src/models/Produto');
    Movimentacao = require('../src/models/Movimentacao');
    await sequelize.authenticate();
    await sequelize.sync();
    const hash = await bcrypt.hash(senha, 10);
    admin = await Usuario.create({ nome: 'Administrador de teste', email: 'admin@teste.local', senha: hash, tipo: 'administrador' });
    operador = await Usuario.create({ nome: 'Operador de teste', email: 'operador@teste.local', senha: hash, tipo: 'operador' });
    tokenAdmin = jwt.sign({ id: admin.id, tipo: admin.tipo }, process.env.JWT_SECRET, { expiresIn: '1h' });
    tokenOperador = jwt.sign({ id: operador.id, tipo: operador.tipo }, process.env.JWT_SECRET, { expiresIn: '1h' });
    servidor = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { servidor.once('listening', resolve); servidor.once('error', reject); });
    url = 'http://127.0.0.1:' + servidor.address().port;
    relatorio.ambiente.baseUrl = url;
    for (const caso of plano.casos) {
      atual = { ...caso, inicio: new Date().toISOString(), evidencias: [] };
      try {
        await testes[caso.id]();
        atual.status = 'aprovado';
        atual.conclusao = 'Resultado obtido atende ao esperado.';
      } catch (erro) {
        atual.status = 'falhou';
        atual.conclusao = seguro(erro.message);
        process.exitCode = 1;
      }
      atual.fim = new Date().toISOString();
      relatorio.casos.push(atual);
      fs.writeFileSync(path.join(pasta, 'cenario' + caso.id + '.json'), JSON.stringify(seguro(atual), null, 2) + '\n');
      console.log('Cenário ' + caso.id + ': ' + atual.status + ' - ' + caso.titulo);
    }
  } catch (erro) {
    relatorio.erroPreparacao = seguro(erro.message);
    process.exitCode = 1;
    console.error('Preparação dos testes: ' + relatorio.erroPreparacao);
  } finally {
    if (servidor) await new Promise(resolve => servidor.close(resolve));
    if (sequelize) await sequelize.close();
    if (conexao) await conexao.end();
    relatorio.fim = new Date().toISOString();
    relatorio.resumo = {
      previstos: plano.casos.length,
      executados: relatorio.casos.length,
      aprovados: relatorio.casos.filter(item => item.status === 'aprovado').length,
      falhas: relatorio.casos.filter(item => item.status === 'falhou').length,
      bloqueados: plano.casos.length - relatorio.casos.length,
    };
    relatorio.criterioSaidaAtendido = relatorio.resumo.aprovados === plano.casos.length;
    fs.writeFileSync(path.join(pasta, 'execucao.json'), JSON.stringify(seguro(relatorio), null, 2) + '\n');
    console.log(JSON.stringify(relatorio.resumo));
    console.log('Banco de teste preservado: ' + banco);
  }
}
executar().catch(erro => { console.error(seguro(erro.message)); process.exitCode = 1; });
