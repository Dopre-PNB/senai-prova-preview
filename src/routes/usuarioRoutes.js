const express = require('express');
const controller = require('../controllers/usuarioController');
const autenticar = require('../middlewares/auth');
const permitir = require('../middlewares/checkRole');

const router = express.Router();
router.post('/usuarios', controller.cadastrar);
router.get('/usuarios/me', autenticar, controller.atual);
router.get('/usuarios', autenticar, permitir('administrador'), controller.listar);
router.put('/usuarios/:id', autenticar, controller.atualizar);
router.delete('/usuarios/:id', autenticar, permitir('administrador'), controller.deletar);

module.exports = router;
