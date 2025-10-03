const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/payment.controller');

router.post('/order', auth, ctrl.createOrder); // create razorpay order
router.post('/verify', auth, ctrl.verifyPayment);

module.exports = router;
