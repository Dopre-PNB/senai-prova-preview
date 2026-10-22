function mensagem(texto, erro = false, id = 'mensagem') {
  const elemento = document.getElementById(id);
  elemento.textContent = texto;
  elemento.className = 'mensagem ' + (erro ? 'erro' : 'sucesso');
}

async function api(caminho, opcoes = {}) {
  const headers = { ...opcoes.headers };
  const token = sessionStorage.getItem('token');
  if (token) headers.Authorization = 'Bearer ' + token;
  if (opcoes.body) headers['Content-Type'] = 'application/json';
  let resposta;
  try {
    resposta = await fetch(caminho, { ...opcoes, headers });
  } catch {
    throw new Error('Não foi possível conectar ao servidor.');
  }
  const dados = await resposta.json().catch(() => ({}));
  if (resposta.status === 401 && token && caminho !== '/login') {
    sessionStorage.removeItem('token');
    location.replace('/');
    throw new Error('Sessão encerrada. Entre novamente.');
  }
  if (!resposta.ok) throw new Error(dados.erro || dados.mensagem || 'Não foi possível concluir a operação.');
  return dados;
}

async function sessao() {
  if (!sessionStorage.getItem('token')) {
    location.replace('/');
    return null;
  }
  const usuario = await api('/usuarios/me');
  document.getElementById('usuario').textContent = usuario.nome + ' - ' + usuario.tipo;
  document.querySelectorAll('[data-admin]').forEach(elemento => {
    elemento.hidden = usuario.tipo !== 'administrador';
  });
  document.getElementById('sair').addEventListener('click', () => {
    sessionStorage.removeItem('token');
    location.replace('/');
  });
  return usuario;
}

function celula(linha, texto) {
  const td = document.createElement('td');
  td.textContent = texto ?? '';
  linha.appendChild(td);
  return td;
}

function botao(celula, texto, acao) {
  const elemento = document.createElement('button');
  elemento.type = 'button';
  elemento.textContent = texto;
  elemento.addEventListener('click', acao);
  celula.appendChild(elemento);
}

function dataHora(valor) {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '';
}

function dadosFormulario(formulario) {
  return Object.fromEntries(new FormData(formulario));
}

async function enviarFormulario(evento, executar) {
  evento.preventDefault();
  const botao = evento.currentTarget.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    await executar();
  } catch (erro) {
    mensagem(erro.message, true);
  } finally {
    botao.disabled = false;
  }
}
