require('dotenv').config({ quiet: true });
const express = require('express');
const path = require('path');
const sequelize = require('./config/database');
const usuarioRoutes = require('./routes/usuarioRoutes');
const authRoutes = require('./routes/authRoutes');
const produtoRoutes = require('./routes/produtoRoutes');
const movimentacaoRoutes = require('./routes/movimentacaoRoutes');
const tratarErros = require('./middlewares/erros');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(usuarioRoutes);
app.use(authRoutes);
app.use(produtoRoutes);
app.use(movimentacaoRoutes);
app.use((req, res) => res.status(404).json({ mensagem: 'Rota não encontrada' }));
app.use(tratarErros);

if (require.main === module) {
  (async () => {
    if (!process.env.JWT_SECRET) throw new Error('Preencha JWT_SECRET no arquivo .env');
    await sequelize.authenticate();
    console.log('Conectado ao banco de dados');
    await sequelize.sync();
    const porta = Number(process.env.PORT || 3001);
    app.listen(porta, () => console.log(`Servidor rodando na porta ${porta}`));
  })().catch((erro) => {
    console.error('Não foi possível iniciar o servidor:', erro.message);
    process.exitCode = 1;
  });
}

module.exports = app;
