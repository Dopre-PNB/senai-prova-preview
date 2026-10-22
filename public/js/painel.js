async function iniciar() {
  const usuario = await sessao();
  if (!usuario) return;
  const formulario = document.getElementById('perfil');
  formulario.elements.nome.value = usuario.nome;
  formulario.elements.email.value = usuario.email;
  formulario.addEventListener('submit', evento => {
    const dados = dadosFormulario(formulario);
    if (!dados.senha) delete dados.senha;
    enviarFormulario(evento, async () => {
      const atualizado = await api('/usuarios/' + usuario.id, { method: 'PUT', body: JSON.stringify(dados) });
      document.getElementById('usuario').textContent = atualizado.nome + ' - ' + atualizado.tipo;
      formulario.elements.senha.value = '';
      mensagem('Dados atualizados.');
    });
  });
}

iniciar().catch(erro => mensagem(erro.message, true));
