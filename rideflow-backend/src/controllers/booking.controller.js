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
// Drivers are stored in the User collection (role: 'driver') — use User model to find nearest drivers
const User = require('../models/User.model');


exports.requestRide = async (req, res) => {
  try {
    console.log('➡️ requestRide called; Authorization header:', req.headers.authorization);
    console.log('➡️ requestRide; user from middleware:', req.user ? { id: req.user._id, role: req.user.role } : null);
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized — not authenticated' });

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

    const onlineDriversCount = await User.countDocuments({ role: 'driver', isOnline: true });
    console.log(`🔎 Drivers online: ${onlineDriversCount}`);

    // For debugging: list a few candidate drivers up to wider radius
    try {
      const candidates = await User.find({
        role: 'driver',
        isOnline: true,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: 20000,
          },
        },
      }).limit(10).select('name location isOnline');
      console.log('🔍 Nearby driver candidates (within 20km):', candidates.map(c => ({ id: c._id, name: c.name, loc: c.location, isOnline: c.isOnline })));
    } catch (dbgErr) {
      console.warn('⚠️ debug: candidate search errored', dbgErr.message);
    }

    // Compute route distance & duration using Mapbox Directions (if token available)
    let distanceKm = 0;
    let estimatedTimeMin = 0;
    try {
      const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
      if (MAPBOX_TOKEN) {
        const [dstLng, dstLat] = destination.location.coordinates || [];
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${dstLng},${dstLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const r = await fetch(url);
        const d = await r.json();
        if (d && d.routes && d.routes.length > 0) {
          const route = d.routes[0];
          distanceKm = Math.round((route.distance / 1000) * 10) / 10; // one decimal
          estimatedTimeMin = Math.max(1, Math.round(route.duration / 60));
        }
      }
    } catch (e) {
      console.warn('⚠️ mapbox directions failed:', e.message || e);
    }

    const paymentMethod = req.body.paymentMethod || 'online';

    // Ensure a consistent per-km rate (rupees per km). Use env or default to 10 rupees/km
    const perKmRate = Number(process.env.PER_KM_RATE_RUPEES || 10);
    const computedFarePaise = Math.round(distanceKm * perKmRate * 100);

    console.log('ℹ️ computedFarePaise:', computedFarePaise, 'received fare:', fare, 'paymentMethod:', paymentMethod);

    let booking;
    try {
      booking = await Booking.create({
        rider: user._id,
        pickup,
        destination,
        rideType: rideType || 'standard',
        fare: typeof fare === 'number' && fare > 0 ? fare : computedFarePaise,
        distanceKm,
        estimatedTimeMin,
        paymentMethod,
        status: paymentMethod === 'online' ? 'pending_payment' : 'requested',
        requestedAt: new Date(),
      });
      console.log('✅ booking created:', booking._id);
    } catch (createErr) {
      console.error('❌ Booking.create failed:', createErr.stack || createErr);
      throw createErr;
    }

    // If payment method is 'cash', notify drivers immediately.
    // If 'online', wait until payment verification to notify drivers.
    const helpers = require('../socket').helpers || {};

    if (booking.paymentMethod === 'cash') {
      const nearbyDrivers = await User.find({
        role: 'driver',
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: Math.max(maxDistance, 20000),
          },
        },
      }).limit(20).select('name phone vehicle rating location isOnline');

      console.log(`🔎 Found ${nearbyDrivers.length} nearby drivers — notifying via socket`);

      const payload = {
        bookingId: booking._id,
        rider: { id: user._id, name: user.name },
        pickup,
        destination,
        fare: booking.fare,
        rideType: booking.rideType,
      };

      // Prefer notifying specific drivers if connected; also broadcast to drivers room
      nearbyDrivers.forEach((d) => {
        if (helpers.isUserConnected && helpers.isUserConnected(d._id)) {
          try {
            helpers.emitToUser(d._id, 'ride:request', payload);
          } catch (e) {}
        }
      });

      try {
        helpers.emitToRoom && helpers.emitToRoom('drivers', 'ride:request', payload);
      } catch (e) {}
    }

    res.json({ booking, suggestedDriversCount: 0 });
  } catch (err) {
    console.error('requestRide error', err);
    res.status(500).json({ message: err?.message || 'Server error' });
  }
};

exports.acceptBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const driver = req.user;
    if (driver.role !== 'driver') return res.status(403).json({ message: 'Only drivers' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'requested') return res.status(400).json({ message: 'Booking not available' });

    // generate a 6-digit OTP for rider-driver verification
    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    booking.driver = driver._id;
    booking.status = 'accepted';
    booking.otp = otp;
    booking.otpExpiresAt = new Date(Date.now() + (10 * 60 * 1000)); // valid 10 minutes
    booking.otpVerified = false;
    await booking.save();
    console.log('✅ Booking accepted:', booking._id.toString(), 'by driver', driver._id.toString(), 'otp:', otp);

    // attach current booking to driver (User model)
    const riderId = booking.rider;
    driver.currentBooking = booking._id;
    // keep driver online so the dashboard shows the active ride without requiring manual toggle
    await driver.save();

    // notify rider and booking room (include OTP for demo; in production send via SMS/push)
    const helpers = require('../socket').helpers || {};
    try {
      helpers.emitToUser(riderId, 'ride:accepted', {
        bookingId: booking._id,
        driverId: driver._id,
        driverInfo: { id: driver._id, name: driver.name, phone: driver.phone, vehicle: driver.vehicle },
        fare: booking.fare,
        paymentMethod: booking.paymentMethod,
        distanceKm: booking.distanceKm,
        estimatedTimeMin: booking.estimatedTimeMin,
        otp,
      });

      helpers.emitToRoom && helpers.emitToRoom(`booking:${booking._id}`, 'ride:confirmed', {
        bookingId: booking._id,
        driverId: driver._id,
        fare: booking.fare,
        paymentMethod: booking.paymentMethod,
      });
    } catch (e) {
      console.warn('⚠️ notify rider failed', e.message);
    }

    res.json({ booking });
  } catch (err) {
    console.error('acceptBooking error', err);
    res.status(500).json({ message: 'Failed to accept booking', error: err.message });
  }
};

// Verify OTP and start ride (driver)
exports.verifyOtpAndStart = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const driver = req.user;
    if (driver.role !== 'driver') return res.status(403).json({ message: 'Only drivers' });

    const { otp } = req.body;
    const providedOtp = String(otp || '').trim();
    if (!providedOtp) return res.status(400).json({ message: 'OTP required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.driver || booking.driver.toString() !== driver._id.toString()) return res.status(403).json({ message: 'Not your booking' });
    if (booking.status !== 'accepted') return res.status(400).json({ message: 'Booking not in accepted state' });

    const storedOtp = String(booking.otp || '').trim();
    // log for debugging (remove or lower log level in production)
    console.log('verifyOtpAndStart:', { bookingId: booking._id.toString(), driverId: driver._id.toString(), providedOtp, storedOtp, expiresAt: booking.otpExpiresAt });

    if (booking.otpExpiresAt && booking.otpExpiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });

    if (!storedOtp || storedOtp !== providedOtp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    booking.otpVerified = true;
    booking.status = 'started';
    booking.startedAt = new Date();
    await booking.save();

    const helpers = require('../socket').helpers || {};
    try {
      helpers.emitToRoom && helpers.emitToRoom(`booking:${booking._id}`, 'ride:started', { bookingId: booking._id, startedAt: booking.startedAt });
    } catch (e) {}

    res.json({ booking });
  } catch (err) {
    console.error('verifyOtpAndStart error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const user = req.user;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Only the rider who created the booking can cancel it
    if (user.role !== 'rider' || String(booking.rider) !== String(user._id)) {
      return res.status(403).json({ message: 'Only the rider who created the booking can cancel it' });
    }

    // Don't allow cancellation if ride has started or completed or already cancelled
    if (['started','completed','cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot cancel this booking' });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = 'cancelled by rider';
    await booking.save();

    // free driver if assigned
    if (booking.driver) {
      const driver = await User.findById(booking.driver);
      if (driver) {
        driver.currentBooking = null;
        driver.isOnline = true;
        await driver.save();
      }
    }

    // notify via sockets — notify rider, and send a silent refresh to driver (no UI notification)
    const helpers = require('../socket').helpers || {};
    try {
      // silent notify driver to refresh their dashboard state without showing a cancellation UI
      if (booking.driver) {
        try {
          helpers.emitToUser(booking.driver, 'driver:booking-cleared', { bookingId: booking._id });
        } catch (innerErr) {}
      }

      helpers.emitToUser(booking.rider, 'booking:cancelled', { bookingId: booking._id });
    } catch (e) {}

    res.json({ booking });
  } catch (err) {
    console.error('cancelBooking error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
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
    let booking = await Booking.findById(id)
      .populate('driver', 'name phone rating vehicle location')
      .populate('rider', 'name email phone');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Only reveal OTP to the rider for demo purposes
    const requesterId = req.user && req.user._id ? req.user._id.toString() : null;
    const bookingObj = booking.toObject();
    if (!requesterId || String(booking.rider._id) !== requesterId) {
      delete bookingObj.otp;
      delete bookingObj.otpExpiresAt;
    }

    res.json({ booking: bookingObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Simple driver dashboard data
exports.dashboardForDriver = async (req, res) => {
  try {
    const user = req.user;
    // refresh driver from DB to get up-to-date rating and online status
    const driver = await User.findById(user._id).select('-password');

    const activeRide = await Booking.findOne({ driver: user._id, status: { $in: ['accepted','started'] } }).populate('rider', 'name rating');

    // compute stats: earnings and rides for today and last 7 days, and total driving hours (sum of ride durations)
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0,0,0,0);
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // include today => 7 days window

    // fetch completed bookings in the last 7 days
    const completedBookings = await Booking.find({
      driver: user._id,
      status: 'completed',
      completedAt: { $gte: sevenDaysAgo }
    });

    // initialize weekly buckets (oldest -> newest)
    const weeklyStats = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      weeklyStats.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), earnings: 0 });
    }

    let todayEarnings = 0;
    let todayRides = 0;
    let totalRideMs = 0;

    completedBookings.forEach((b) => {
      const comp = b.completedAt ? new Date(b.completedAt) : null;
      if (!comp) return;

      // earnings (fare stored in smallest currency unit)
      const fare = typeof b.fare === 'number' ? b.fare : 0;

      // if within this week window, add to correct bucket
      const dayIndex = Math.floor((comp - sevenDaysAgo) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyStats[dayIndex].earnings += fare;
      }

      // if completed today
      if (comp >= startOfToday) {
        todayEarnings += fare;
        todayRides += 1;
      }

      if (b.startedAt && b.completedAt) {
        try {
          const dur = new Date(b.completedAt) - new Date(b.startedAt);
          if (!isNaN(dur) && dur > 0) totalRideMs += dur;
        } catch (e) {}
      }
    });

    const hours = Math.round((totalRideMs / (1000 * 60 * 60)) * 10) / 10; // 1 decimal place

    const todayStats = { earnings: todayEarnings, rides: todayRides, hours, rating: driver.rating || 5 };

    res.json({ driver: driver, activeRide, todayStats, weeklyStats });
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

    // free the driver (User model)
    if (booking.driver) {
      const driver = await User.findById(booking.driver);
      if (driver) {
        driver.currentBooking = null;
        driver.isOnline = true; // set back online after completing
        await driver.save();
      }
    }

    // notify booking room
    const helpers = require('../socket').helpers || {};
    try {
      helpers.emitToRoom && helpers.emitToRoom(`booking:${booking._id}`, 'ride:completed', { bookingId: booking._id });
    } catch (e) {}

    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

