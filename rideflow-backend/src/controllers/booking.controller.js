// const Booking = require('../models/Booking.model');
// const User = require('../models/User.model');
// const { geocode } = require('../services/mapbox.service');
// const mongoose = require('mongoose');

// const RADIUS_METERS = 5000; // find drivers within 5km by default

// // create a booking (rider)
// exports.createBooking = async (req, res) => {
//   try {
//     const { pickupAddress, pickupLng, pickupLat, destAddress, destLng, destLat, rideType } = req.body;
//     if (!pickupLng || !pickupLat || !destLng || !destLat) {
//       return res.status(400).json({ message: 'Missing coordinates' });
//     }
//     const rider = req.user;

//     const pickup = {
//       address: pickupAddress || '',
//       location: { type: 'Point', coordinates: [pickupLng, pickupLat] }
//     };
//     const destination = {
//       address: destAddress || '',
//       location: { type: 'Point', coordinates: [destLng, destLat] }
//     };

//     // Very simple fare calc — replace with proper formula
//     const dx = pickupLng - destLng;
//     const dy = pickupLat - destLat;
//     const distanceKm = Math.max(0.5, Math.sqrt(dx * dx + dy * dy) * 111); // rough
//     const fare = Math.round(distanceKm * 2 * 100) / 100; // $2 per km

//     const booking = await Booking.create({
//       rider: rider._id,
//       pickup,
//       destination,
//       distanceKm,
//       fare,
//       status: 'requested'
//     });

//     // Find nearest available driver
//     const nearbyDrivers = await User.find({
//       role: 'driver',
//       isOnline: true,
//       location: {
//         $near: {
//           $geometry: { type: 'Point', coordinates: [pickupLng, pickupLat] },
//           $maxDistance: RADIUS_METERS
//         }
//       }
//     }).limit(10);

//     // Emit to drivers via socket
//     const { io } = require('../socket');
//     nearbyDrivers.forEach((drv) => {
//       // send a 'ride:request' event to driver
//       io.to(`user:${drv._id}`).emit('ride:request', { bookingId: booking._id, pickup, destination, fare, distanceKm });
//     });

//     res.json({ booking, suggestedDriversCount: nearbyDrivers.length });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Failed to create booking', error: err.message });
//   }
// };

// // driver accepts
// exports.acceptBooking = async (req, res) => {
//   try {
//     const bookingId = req.params.id;
//     const driver = req.user;
//     if (driver.role !== 'driver') return res.status(403).json({ message: 'Only drivers' });

//     const booking = await Booking.findById(bookingId);
//     if (!booking) return res.status(404).json({ message: 'Booking not found' });
//     if (booking.status !== 'requested') return res.status(400).json({ message: 'Booking not available' });

//     booking.driver = driver._id;
//     booking.status = 'accepted';
//     await booking.save();

//     // notify rider
//     const { io } = require('../socket');
//     io.to(`user:${booking.rider}`).emit('ride:accepted', { bookingId: booking._id, driverId: driver._id });
//     // join both sockets to room booking:<id>
//     io.to(`user:${driver._id}`).socketsJoin(`booking:${booking._id}`);
//     io.to(`user:${booking.rider}`).socketsJoin(`booking:${booking._id}`);

//     res.json({ booking });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Failed to accept booking', error: err.message });
//   }
// };

// // complete booking
// exports.completeBooking = async (req, res) => {
//   try {
//     const bookingId = req.params.id;
//     const driver = req.user;
//     if (driver.role !== 'driver') return res.status(403).json({ message: 'Only drivers' });

//     const booking = await Booking.findById(bookingId);
//     if (!booking) return res.status(404).json({ message: 'Booking not found' });
//     if (!booking.driver || booking.driver.toString() !== driver._id.toString()) return res.status(403).json({ message: 'Not your booking' });

//     booking.status = 'completed';
//     await booking.save();

//     const { io } = require('../socket');
//     io.to(`booking:${booking._id}`).emit('ride:completed', { bookingId: booking._id });

//     res.json({ booking });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Failed to complete booking', error: err.message });
//   }
// };

// // get driver/rider dashboard data (the frontend earlier calls /driver/dashboard)
// exports.dashboardForDriver = async (req, res) => {
//   try {
//     const user = req.user;
//     // For demo: return driver info, active ride if any, today stats rudimentary
//     const activeRide = await Booking.findOne({ driver: user._id, status: { $in: ['accepted','started'] } }).populate('rider', 'name rating');
//     const todayStats = { earnings: 0, rides: 0, hours: 0, rating: user.rating || 5 };
//     const weeklyStats = []; // populate with sample
//     for (let i = 0; i < 7; i++) weeklyStats.push({ day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i], earnings: Math.round(Math.random()*50) });

//     res.json({ driver: user, activeRide, todayStats, weeklyStats });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Failed', error: err.message });
//   }
// };




/**
 * Request a ride
 * Expected body:
 *  {
 *    pickup: { address, location: { type: 'Point', coordinates: [lng, lat] } },
 *    destination: { address, location: { type: 'Point', coordinates: [lng, lat] } },
 *    rideType: string,
 *    estimatedFare: number
 *  }
 */

// src/controllers/booking.controller.js
const Booking = require('../models/Booking.model');
const Driver = require('../models/Driver.model');
const User = require('../models/User.model');


exports.requestRide = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { pickup, destination, rideType, fare } = req.body; // <-- use fare instead of estimatedFare
    if (!pickup || !destination) {
      return res.status(400).json({ message: 'Pickup and destination required.' });
    }

    const [lng, lat] = pickup.location?.coordinates || [];

    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return res.status(400).json({ message: 'Invalid pickup coordinates.' });
    }

    // Find nearest available driver within 5km
    const maxDistance = 5000; // meters, adjust as needed

    const nearestDriver = await Driver.findOne({
      isAvailable: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistance,
        },
      },
    }).select('+phone +vehicle +rating');

    if (!nearestDriver) {
      return res.status(404).json({ message: 'No drivers found nearby. Try again later.' });
    }

    // Create booking
    const booking = await Booking.create({
      rider: user._id,
      driver: nearestDriver._id,
      pickup,
      destination,
      rideType: rideType || 'standard',
      fare: fare || 0,   // <-- map frontend's `fare` to DB's `estimatedFare`
      status: 'requested',
      requestedAt: new Date(),
    });

    // Mark driver as not available (busy) and attach currentBooking reference
    nearestDriver.isAvailable = false;
    nearestDriver.currentBooking = booking._id;
    await nearestDriver.save();

    // Optionally you can trigger websocket/notification here to inform driver.

    // Populate booking response with minimal driver info
    const driverInfo = {
      id: nearestDriver._id,
      name: nearestDriver.name,
      phone: nearestDriver.phone,
      vehicle: nearestDriver.vehicle,
      location: nearestDriver.location,
      rating: nearestDriver.rating,
    };

    res.json({ booking, driver: driverInfo });
  } catch (err) {
    console.error('requestRide error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBookingsForUser = async (req, res) => {
  try {
    const user = req.user;
    const bookings = await Booking.find({ rider: user._id })
      .populate('driver', 'name phone rating vehicle location')
      .sort({ requestedAt: -1 });
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate('driver', 'name phone rating vehicle location')
      .populate('rider', 'name email phone');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.completeRide = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    // free the driver
    if (booking.driver) {
      const driver = await Driver.findById(booking.driver);
      if (driver) {
        driver.isAvailable = true;
        driver.currentBooking = null;
        await driver.save();
      }
    }

    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

