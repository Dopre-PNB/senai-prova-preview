document.getElementById('login').addEventListener('submit', evento => {
  const dados = dadosFormulario(evento.currentTarget);
  enviarFormulario(evento, async () => {
    const resultado = await api('/login', { method: 'POST', body: JSON.stringify(dados) });
    sessionStorage.setItem('token', resultado.token);
    location.href = '/painel.html';
  });
});

document.getElementById('cadastro').addEventListener('submit', async evento => {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const botao = formulario.querySelector('button');
  botao.disabled = true;
  try {
    await api('/usuarios', { method: 'POST', body: JSON.stringify(dadosFormulario(formulario)) });
    formulario.reset();
    mensagem('Operador cadastrado. Use o e-mail e a senha para entrar.', false, 'cadastro-mensagem');
  } catch (erro) {
    mensagem(erro.message, true, 'cadastro-mensagem');
  } finally {
    botao.disabled = false;
  }
});
