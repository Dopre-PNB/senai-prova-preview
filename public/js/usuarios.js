let usuarioAtual;

function cancelarEdicao() {
  document.getElementById('cadastro-usuario').reset();
  document.getElementById('usuario-id').value = '';
  document.getElementById('form-titulo').textContent = 'Cadastrar usuário';
  document.getElementById('senha').required = true;
  document.getElementById('tipo-edicao').hidden = true;
  document.getElementById('cancelar').hidden = true;
}

function editar(usuario) {
  document.getElementById('usuario-id').value = usuario.id;
  document.getElementById('nome').value = usuario.nome;
  document.getElementById('email').value = usuario.email;
  document.getElementById('senha').value = '';
  document.getElementById('senha').required = false;
  document.getElementById('tipo').value = usuario.tipo;
  document.getElementById('tipo-edicao').hidden = false;
  document.getElementById('cancelar').hidden = false;
  document.getElementById('form-titulo').textContent = 'Editar usuário ' + usuario.id;
  document.getElementById('nome').focus();
}

async function excluir(usuario) {
  if (!confirm('Excluir o usuário ' + usuario.nome + '?')) return;
  try {
    await api('/usuarios/' + usuario.id, { method: 'DELETE' });
    if (document.getElementById('usuario-id').value === String(usuario.id)) cancelarEdicao();
    await carregar();
    mensagem('Usuário excluído.');
  } catch (erro) {
    mensagem(erro.message, true);
  }
}

async function carregar() {
  const usuarios = await api('/usuarios');
  const lista = document.getElementById('lista');
  lista.replaceChildren();
  for (const usuario of usuarios) {
    const linha = document.createElement('tr');
    celula(linha, usuario.id);
    celula(linha, usuario.nome);
    celula(linha, usuario.email);
    celula(linha, usuario.tipo);
    const acoes = celula(linha, '');
    botao(acoes, 'Editar', () => editar(usuario));
    if (usuario.id !== usuarioAtual.id) botao(acoes, 'Excluir', () => excluir(usuario));
    lista.appendChild(linha);
  }
}

async function iniciar() {
  usuarioAtual = await sessao();
  if (!usuarioAtual) return;
  if (usuarioAtual.tipo !== 'administrador') {
    mensagem('Acesso permitido somente ao administrador.', true);
    return;
  }
  document.getElementById('gestao').hidden = false;
  document.getElementById('cadastro-usuario').addEventListener('submit', evento => {
    const dados = dadosFormulario(evento.currentTarget);
    const id = document.getElementById('usuario-id').value;
    if (!dados.senha) delete dados.senha;
    if (!id) delete dados.tipo;
    enviarFormulario(evento, async () => {
      await api('/usuarios' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST', body: JSON.stringify(dados),
      });
      if (id === String(usuarioAtual.id) && dados.tipo !== 'administrador') {
        location.href = '/painel.html';
        return;
      }
      cancelarEdicao();
      await carregar();
      mensagem(id ? 'Usuário atualizado.' : 'Operador cadastrado.');
    });
  });
  document.getElementById('cancelar').addEventListener('click', cancelarEdicao);
  await carregar();
}

iniciar().catch(erro => mensagem(erro.message, true));
