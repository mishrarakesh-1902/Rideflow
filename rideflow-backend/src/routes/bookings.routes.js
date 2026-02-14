const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/booking.controller');

// rider creates booking (not used directly — frontend calls /api/rides/request)
// but keep route for compatibility
router.post('/', auth, role(['rider']), ctrl.requestRide);

// driver accepts booking
router.patch('/:id/accept', auth, role(['driver']), ctrl.acceptBooking);

// driver verifies OTP and starts ride
router.patch('/:id/verify-otp', auth, role(['driver']), ctrl.verifyOtpAndStart);

// driver completes booking
router.patch('/:id/complete', auth, role(['driver']), ctrl.completeRide);

// rider cancels booking
router.patch('/:id/cancel', auth, role(['rider']), ctrl.cancelBooking);

// get booking details (rider or driver)
router.get('/:id', auth, ctrl.getBooking);

// driver dashboard endpoint used by frontend
router.get('/driver/dashboard', auth, role(['driver']), ctrl.dashboardForDriver);

module.exports = router;
