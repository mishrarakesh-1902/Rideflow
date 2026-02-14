const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware')('driver');
const ctrl = require('../controllers/driver.controller');

router.patch('/location', auth, role, ctrl.patchLocation); // frontend uses PATCH /driver/location
router.patch('/status', auth, role, ctrl.toggleStatus);
// public: available drivers count
router.get('/available', ctrl.getAvailableDrivers);
module.exports = router;
