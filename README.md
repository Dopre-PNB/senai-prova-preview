# Prova prática Função 2

Sistema de almoxarifado da situação-problema do PDF da prova. Implementa os perfis administrador e operador, o controle de saldo e o registro das movimentações com data, hora e responsável.

## Entregas da prova

| Entrega | Implementação |
|---|---|
| Versionamento | Branch `pedro-braga`, criada de `main`, e pull request para `main` |
| Arquitetura do sistema | Código separado em rotas, controladores, serviços, modelos e middlewares |
| Usuários, perfis e segurança | Cadastro, autenticação, dois perfis e rotas privadas com controle de acesso |
| Estoque | Produtos com paginação e filtros por nome e data; movimentações com atualização do saldo e bloqueio de saída acima do disponível |
| Testes | Três cenários de saída, plano em `docs/plano_testes.docx`, evidências em `docs/testes` e `resultados.docx` na raiz |

## Executar

Esta implementação usa Node.js 24 ou superior, Express, Sequelize e MySQL 8. Para executar localmente, mantenha o serviço MySQL em execução.

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

A API atende em `http://localhost:3001`. O comando `admin` prepara o primeiro administrador. As outras contas são cadastradas por um administrador autenticado.

## Rotas

Exceto o login, as rotas exigem `Authorization: Bearer TOKEN`.

| Método e rota | Acesso | Função |
|---|---|---|
| POST /login | Público | Autenticar e receber token e identificação do perfil |
| POST /usuarios | Administrador | Cadastrar usuário com tipo operador ou administrador |
| GET /produtos | Autenticado | Listar produtos com paginação e filtros |
| POST /produtos | Autenticado | Cadastrar produto |
| PUT /produtos/:id | Autenticado | Atualizar nome e descrição |
| DELETE /produtos/:id | Administrador | Excluir produto |
| GET /movimentacoes | Autenticado | Consultar as movimentações |
| POST /movimentacoes | Autenticado | Registrar entrada ou saída |

Consulta de exemplo: `/produtos?pagina=1&limite=10&nome=Detergente&data=2026-10-01`. O filtro de data considera produtos cadastrados a partir da data informada.

Corpo de uma movimentação:

```json
{"produto_id":1,"tipo":"saida","quantidade":4}
```

Uma saída acima do saldo retorna HTTP 400 com a quantidade disponível e a solicitada. Não altera o estoque nem cria movimentação. Saídas menores ou iguais ao saldo são permitidas e registram data, hora e o responsável identificado pelo token.

O estoque e a movimentação são gravados na mesma transação. O operador consulta, insere e atualiza os produtos; somente o administrador exclui. A exclusão do produto preserva seu histórico.

## Organização

O código está separado em `config`, `models`, `routes`, `controllers`, `services` e `middlewares`, dentro de `src`. As entidades são Usuario, Produto e Movimentacao. A regra de saldo está em `src/services/movimentacaoService.js`.

## Testes e documentos

```powershell
npm test
```

O comando usa um banco de teste novo e dados fictícios. Executa os três cenários do plano: saída maior, menor e igual ao saldo disponível. O banco da aplicação não é alterado.

- `docs/plano_testes.docx`: dados, procedimentos e resultados esperados dos três cenários.
- `docs/testes/cenario1.json`, `cenario2.json` e `cenario3.json`: evidências obtidas na execução.
- `resultados.docx`: dados usados, saída obtida e conclusão de cada cenário.

## Versionamento

A branch `pedro-braga` foi criada a partir de `main`. A entrega da prova está no [pull request para main](https://github.com/Dopre-PNB/senai-prova-preview/pull/1).
