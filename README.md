# Almoxarifado

Controle de produtos e movimentações com administrador e operador. Feito em Node.js, Express, Sequelize e MySQL, com páginas simples em HTML, CSS e JavaScript.

## Executar

É necessário ter Node.js 24 ou superior e MySQL 8 em execução.

```powershell
npm ci
Copy-Item .env.example .env
```

Preencha a conexão do banco, `JWT_SECRET` e os campos `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` no `.env`.

```powershell
npm run db:create
npm run admin
npm start
```

Abra http://localhost:3001. O comando `admin` cria o primeiro administrador e deve ser executado uma vez para cada email. Os demais usuários são cadastrados como operadores. O administrador pode alterar seus perfis na tela de usuários.

Na cópia local usada para a verificação, o `.env` já está preenchido e há um produto de demonstração chamado Detergente, com saldo 10. Ao baixar o projeto em outro computador, configure seu próprio `.env` e crie o administrador com os comandos acima.

## Uso

1. Entre com o email e a senha.
2. Cadastre um produto. Pela tela, ele começa com saldo zero.
3. Registre uma entrada para adicionar unidades e uma saída para retirar.
4. Consulte o histórico para conferir data, quantidade e responsável.

O operador consulta, cadastra e atualiza produtos. O administrador também exclui produtos e gerencia usuários. Cada usuário pode atualizar os próprios dados. Toda permissão é conferida pela API.

Uma saída acima do saldo retorna HTTP 400 e informa a quantidade disponível e a solicitada. A operação não altera o saldo nem cria movimentação. Saídas menores ou iguais ao saldo são permitidas. Quantidades devem ser inteiras e positivas.

Saldo e movimentação são gravados na mesma transação, com bloqueio do produto durante a conferência. O responsável vem do token de login. A exclusão de produtos e usuários é lógica, mantendo o histórico.

## Organização

```text
src/config         conexão com o banco
src/models         Usuario, Produto e Movimentacao
src/routes         rotas e permissões
src/controllers    requisições e respostas
src/services       validações e regras de negócio
src/middlewares    autenticação, autorização e erros
public             telas básicas
scripts            preparo do banco, administrador e testes
docs               plano e evidências
```

Um usuário tem várias movimentações e um produto tem várias movimentações. Cada movimentação pertence a um produto e a um usuário. A regra de saldo está em `src/services/movimentacaoService.js`.

## Rotas

As rotas privadas recebem `Authorization: Bearer TOKEN`.

| Método e rota | Acesso | Função |
|---|---|---|
| POST /usuarios | Público | Cadastrar operador |
| POST /login | Público | Autenticar e receber token |
| GET /usuarios/me | Autenticado | Consultar o próprio usuário |
| GET /usuarios | Administrador | Listar usuários |
| PUT /usuarios/:id | Próprio usuário ou administrador | Atualizar dados; só administrador altera perfil |
| DELETE /usuarios/:id | Administrador | Excluir outro usuário |
| GET /produtos | Autenticado | Listar com paginação e filtros |
| POST /produtos | Autenticado | Cadastrar produto |
| PUT /produtos/:id | Autenticado | Alterar nome e descrição |
| DELETE /produtos/:id | Administrador | Excluir produto |
| GET /movimentacoes | Autenticado | Consultar histórico |
| POST /movimentacoes | Autenticado | Registrar entrada ou saída |

Exemplo de consulta: `/produtos?pagina=1&limite=10&nome=Detergente&data=2026-10-01`. O filtro de data busca produtos cadastrados a partir da data informada. A resposta é um array, conforme os módulos.

Exemplo de movimentação:

```json
{"produto_id":1,"tipo":"saida","quantidade":4}
```

## Testes

```powershell
npm test
```

O comando cria um banco de teste novo, separado do banco da aplicação. O usuário do MySQL precisa de permissão para criá-lo. Nenhum banco anterior é apagado. Os dados são fictícios e as evidências omitem senhas e tokens.

Execução de 22/10/2026: 26 cenários aprovados, nenhuma falha ou bloqueio. Também foram conferidos no navegador o login, o cadastro de produto, a entrada e a recusa de saída acima do saldo.

- `docs/plano_testes.docx`: plano dos 26 cenários.
- `docs/casos.json`: roteiro lido antes dos testes.
- `docs/testes/cenario1.json` a `cenario26.json`: entradas, respostas e conferência no banco de cada cenário.
- `docs/testes/execucao.json`: resumo, horários, ambiente e identificação do plano.
- `docs/testes/tela-estoque-insuficiente.png`: conferência do erro pela tela.
- `resultados.docx`: dados usados, saída obtida e conclusão de cada cenário.

## Versionamento

O desenvolvimento da prova está na branch `pedro-braga`, criada a partir de `main`. A branch `main` mantém a base do projeto anterior. A versão da prova inclui as telas básicas, o controle de estoque e os documentos de testes.

Os 11 documentos originais de referência foram baixados para consulta e permanecem na pasta local `referencias`, fora deste repositório.
