async function carregarProdutos() {
  const select = document.getElementById('produto-id');
  const selecionado = select.value;
  const produtos = [];
  let pagina = 1;
  let lote;
  do {
    lote = await api('/produtos?pagina=' + pagina + '&limite=100');
    produtos.push(...lote);
    pagina++;
  } while (lote.length === 100);
  select.replaceChildren();
  const vazio = document.createElement('option');
  vazio.value = '';
  vazio.textContent = produtos.length ? 'Selecione um produto' : 'Nenhum produto cadastrado';
  select.appendChild(vazio);
  for (const produto of produtos) {
    const opcao = document.createElement('option');
    opcao.value = produto.id;
    opcao.textContent = produto.nome + ' (saldo: ' + produto.quantidade_estoque + ')';
    select.appendChild(opcao);
  }
  select.value = selecionado;
  document.getElementById('registrar').disabled = !produtos.length;
}

async function carregarHistorico() {
  const movimentacoes = await api('/movimentacoes');
  const lista = document.getElementById('lista');
  lista.replaceChildren();
  for (const movimento of movimentacoes) {
    const linha = document.createElement('tr');
    celula(linha, movimento.id);
    celula(linha, dataHora(movimento.data || movimento.createdAt));
    celula(linha, movimento.Produto?.nome || 'Produto ' + movimento.produto_id);
    celula(linha, movimento.tipo === 'saida' ? 'Saída' : 'Entrada');
    celula(linha, movimento.quantidade);
    celula(linha, movimento.Usuario?.nome || 'Usuário ' + movimento.usuario_id);
    lista.appendChild(linha);
  }
  if (!movimentacoes.length) {
    const linha = document.createElement('tr');
    celula(linha, 'Nenhuma movimentação registrada.').colSpan = 6;
    lista.appendChild(linha);
  }
}

async function atualizar() {
  await Promise.all([carregarProdutos(), carregarHistorico()]);
}

async function iniciar() {
  const usuario = await sessao();
  if (!usuario) return;
  document.getElementById('movimentacao').addEventListener('submit', evento => {
    const dados = dadosFormulario(evento.currentTarget);
    dados.produto_id = Number(dados.produto_id);
    dados.quantidade = Number(dados.quantidade);
    enviarFormulario(evento, async () => {
      const resultado = await api('/movimentacoes', { method: 'POST', body: JSON.stringify(dados) });
      document.getElementById('quantidade').value = '';
      await atualizar();
      mensagem('Movimentação registrada. Saldo atual: ' + resultado.quantidade_estoque + '.');
    });
  });
  document.getElementById('atualizar').addEventListener('click', () => {
    atualizar().catch(erro => mensagem(erro.message, true));
  });
  await atualizar();
}

iniciar().catch(erro => mensagem(erro.message, true));
