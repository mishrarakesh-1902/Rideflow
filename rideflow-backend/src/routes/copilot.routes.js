const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/copilot.controller');

router.post('/chat', auth, ctrl.chat);

module.exports = router;
