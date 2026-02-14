// // src/routes/ride.routes.js
// const express = require('express');
// const router = express.Router();

// const bookingController = require('../controllers/booking.controller');
// const auth = require('../middleware/auth.middleware'); // adjust path if different
// const role = require('../middleware/role.middleware'); // optional role check

// // POST /api/ride/request  -> to match your frontend call
// router.post('/request', auth, role ? role('user') : (req, res, next) => next(), bookingController.requestRide);

// // Optionally expose other endpoints:
// router.get('/my', auth, bookingController.getBookingsForUser);
// router.get('/:id', auth, bookingController.getBooking);
// router.patch('/:id/complete', auth, bookingController.completeRide);

// module.exports = router;

// // src/routes/ride.routes.js
// const express = require('express');
// const router = express.Router();
// const bookingController = require('../controllers/booking.controller');
// const auth = require('../middlewares/auth.middleware');
// const role = require('../middlewares/role.middleware');

// // Rider requests a ride
// router.post('/request', auth, role(['rider']), bookingController.requestRide);

// // Rider fetches all their bookings
// router.get('/my', auth, role(['rider']), bookingController.getBookingsForUser);

// // Rider fetches a single booking
// router.get('/:id', auth, bookingController.getBooking);

// // Driver completes ride
// router.patch('/:id/complete', auth, role(['driver']), bookingController.completeRide);

// module.exports = router;


// src/routes/ride.routes.js
// src/routes/ride.routes.js
const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/booking.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');

// Rider requests a ride
router.post('/request', auth, role(['rider']), bookingController.requestRide);
// Rider fetches all their bookings
router.get('/my', auth, role(['rider']), bookingController.getBookingsForUser);

// Rider fetches a single booking
router.get('/:id', auth, role(['rider']), bookingController.getBooking);

// Driver completes ride
router.patch('/:id/complete', auth, role(['driver']), bookingController.completeRide);

module.exports = router;
