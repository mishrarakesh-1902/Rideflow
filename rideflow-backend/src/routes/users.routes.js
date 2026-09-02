const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/user.controller');

router.get('/', auth, role('admin'), ctrl.getAll);
router.get('/me', auth, ctrl.getMe);
router.patch('/me', auth, ctrl.updateMe);
router.get('/:id', auth, role(['admin']), ctrl.getOne);

module.exports = router;
