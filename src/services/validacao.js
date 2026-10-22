function falhar(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  throw erro;
}

function texto(valor, campo) {
  if (typeof valor !== 'string' || !valor.trim()) {
    falhar(400, `${campo} deve ser preenchido`);
  }
  if (valor.trim().length > 255) falhar(400, `${campo} deve ter no máximo 255 caracteres`);
  return valor.trim();
}

function inteiroPositivo(valor, campo) {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    falhar(400, `${campo} deve ser um número inteiro maior que zero`);
  }
  return valor;
}

module.exports = { falhar, texto, inteiroPositivo };
