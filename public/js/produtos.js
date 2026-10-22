let pagina = 1;
let usuarioAtual;
let filtros = {};

function cancelarEdicao() {
  document.getElementById('produto').reset();
  document.getElementById('produto-id').value = '';
  document.getElementById('form-titulo').textContent = 'Cadastrar produto';
  document.getElementById('cancelar').hidden = true;
}

function editar(produto) {
  document.getElementById('produto-id').value = produto.id;
  document.getElementById('nome').value = produto.nome;
  document.getElementById('descricao').value = produto.descricao || '';
  document.getElementById('form-titulo').textContent = 'Editar produto ' + produto.id;
  document.getElementById('cancelar').hidden = false;
  document.getElementById('nome').focus();
}

async function excluir(produto) {
  if (!confirm('Excluir o produto ' + produto.nome + '?')) return;
  try {
    await api('/produtos/' + produto.id, { method: 'DELETE' });
    if (document.getElementById('produto-id').value === String(produto.id)) cancelarEdicao();
    await carregar();
    mensagem('Produto excluído.');
  } catch (erro) {
    mensagem(erro.message, true);
  }
}

async function carregar() {
  const parametros = new URLSearchParams({ pagina, limite: 10, ...filtros });
  let produtos = await api('/produtos?' + parametros);
  if (produtos.length === 0 && pagina > 1) {
    pagina--;
    return carregar();
  }
  const lista = document.getElementById('lista');
  lista.replaceChildren();
  for (const produto of produtos) {
    const linha = document.createElement('tr');
    celula(linha, produto.id);
    celula(linha, produto.nome);
    celula(linha, produto.descricao);
    celula(linha, produto.quantidade_estoque);
    celula(linha, dataHora(produto.createdAt));
    const acoes = celula(linha, '');
    botao(acoes, 'Editar', () => editar(produto));
    if (usuarioAtual.tipo === 'administrador') botao(acoes, 'Excluir', () => excluir(produto));
    lista.appendChild(linha);
  }
  if (!produtos.length) {
    const linha = document.createElement('tr');
    celula(linha, 'Nenhum produto encontrado.').colSpan = 6;
    lista.appendChild(linha);
  }
  document.getElementById('pagina').textContent = 'Página ' + pagina;
  document.getElementById('anterior').disabled = pagina === 1;
  document.getElementById('proxima').disabled = produtos.length < 10;
}

async function mudarPagina(direcao) {
  const anterior = pagina;
  pagina += direcao;
  try {
    await carregar();
  } catch (erro) {
    pagina = anterior;
    mensagem(erro.message, true);
  }
}

async function iniciar() {
  usuarioAtual = await sessao();
  if (!usuarioAtual) return;
  document.getElementById('produto').addEventListener('submit', evento => {
    const dados = dadosFormulario(evento.currentTarget);
    const id = document.getElementById('produto-id').value;
    enviarFormulario(evento, async () => {
      await api('/produtos' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST', body: JSON.stringify(dados),
      });
      cancelarEdicao();
      await carregar();
      mensagem(id ? 'Produto atualizado.' : 'Produto cadastrado.');
    });
  });
  document.getElementById('cancelar').addEventListener('click', cancelarEdicao);
  document.getElementById('filtro').addEventListener('submit', evento => {
    evento.preventDefault();
    filtros = dadosFormulario(evento.currentTarget);
    pagina = 1;
    carregar().catch(erro => mensagem(erro.message, true));
  });
  document.getElementById('limpar').addEventListener('click', () => {
    document.getElementById('filtro').reset();
    filtros = {};
    pagina = 1;
    carregar().catch(erro => mensagem(erro.message, true));
  });
  document.getElementById('anterior').addEventListener('click', () => mudarPagina(-1));
  document.getElementById('proxima').addEventListener('click', () => mudarPagina(1));
  await carregar();
}

iniciar().catch(erro => mensagem(erro.message, true));
