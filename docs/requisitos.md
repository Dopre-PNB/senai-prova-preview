# Requisitos do almoxarifado

## Funcionalidades

- RF01: cadastrar usuários e autenticar por email e senha.
- RF02: identificar o perfil administrador ou operador após o login.
- RF03: cadastrar, consultar e atualizar produtos; permitir exclusão somente ao administrador.
- RF04: listar produtos com paginação, filtro por nome e data inicial de cadastro.
- RF05: registrar entradas e saídas, atualizando o saldo automaticamente.
- RF06: guardar o produto, a quantidade, o tipo, a data e o usuário responsável em cada movimentação.
- RF07: permitir ao administrador consultar e gerenciar usuários e perfis.

## Regras

- RN01: operador pode consultar, inserir e atualizar; somente administrador pode excluir.
- RN02: saída acima do saldo é bloqueada, informa disponível e solicitado e não altera os registros.
- RN03: saída menor ou igual ao saldo é permitida.
- RN04: quantidade de movimentação é um número inteiro maior que zero.
- RN05: o responsável é identificado pelo token, sem aceitar outro responsável enviado no corpo.
- RN06: saldo e movimentação são gravados juntos; saídas simultâneas não podem gerar saldo negativo.
- RN07: o cadastro público cria operador; a concessão de perfil administrador exige administrador autenticado ou o comando local inicial.

## Qualidade e organização

- Senhas armazenadas com bcrypt e respostas sem a senha ou seu hash.
- Rotas de dados protegidas por JWT e autorização no servidor.
- Mensagens em português e telas básicas que funcionam em computador e celular.
- Arquitetura em camadas, conforme o módulo 2.
- Node.js e MySQL, conforme os módulos 1 e 6.

## Cobertura

| Requisito | Cenários |
|---|---|
| RF01 e RF02 | 5 a 9 |
| RF03 e RN01 | 10 a 12 |
| RF04 | 21 a 23 |
| RF05 e RN02 a RN04 | 1 a 4, 15 a 20, 24 |
| RF06 e RN05 | 2, 3, 11, 18, 25 e 26 |
| RF07 e RN07 | 5, 13 e 14 |
| RN06 | 1 a 4 e 24 |
