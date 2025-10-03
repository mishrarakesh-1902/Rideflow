// const express = require('express');
// const router = express.Router();
// const auth = require('../middlewares/auth.middleware');
// const role = require('../middlewares/role.middleware');
// const ctrl = require('../controllers/booking.controller');

// // rider creates booking
// router.post('/', auth, role(['rider']), ctrl.createBooking);

// // driver accepts booking
// router.patch('/:id/accept', auth, role(['driver']), ctrl.acceptBooking);

// // driver completes booking
// router.patch('/:id/complete', auth, role(['driver']), ctrl.completeBooking);

// // driver dashboard endpoint used by frontend
// router.get('/driver/dashboard', auth, role(['driver']), ctrl.dashboardForDriver);

// module.exports = router;
