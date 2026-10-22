const express = require('express');
const controller = require('../controllers/usuarioController');
const autenticar = require('../middlewares/auth');
const permitir = require('../middlewares/checkRole');

const router = express.Router();
router.post('/usuarios', autenticar, permitir('administrador'), controller.cadastrar);

module.exports = router;
