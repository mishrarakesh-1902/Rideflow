const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');

router.post('/signup', ctrl.signup);
router.post('/login', ctrl.login);
router.get('/me', auth, ctrl.me);
router.patch('/me', auth, ctrl.updateMe);
router.patch('/profile', auth, ctrl.updateMe);

module.exports = router;
