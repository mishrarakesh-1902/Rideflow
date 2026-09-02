// src/services/copilotTools.js
const Booking = require('../models/Booking.model');
const User = require('../models/User.model');

// ---- 1. Schema Gemini sees (no DB access here — just descriptions) ----
const toolDefinitions = [
  {
    name: 'get_my_profile',
    description: "Get the authenticated user's profile details (name, email, phone number, role, vehicle, rating).",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_my_bookings',
    description: "Get the current user's (rider or driver) recent ride bookings, including status, route, and fare.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_booking',
    description: 'Get full details of one specific booking by its ID (status, fare, driver, rider, pickup, destination, OTP status).',
    input_schema: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          description: "The booking's MongoDB ObjectId",
        },
      },
      required: ['bookingId'],
    },
  },
  {
    name: 'get_driver_stats',
    description: "Get the driver's earnings, completed ride count, ratings, vehicle details, and active ride status.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'accept_incoming_ride',
    description: "Accept an incoming requested ride on behalf of the driver.",
    input_schema: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          description: "Optional booking ID. If omitted, accepts the latest incoming requested ride.",
        },
      },
      required: [],
    },
  },
  {
    name: 'cancel_booking',
    description: 'Cancel a booking. Only works if the ride has not already started or completed.',
    input_schema: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          description: "The booking's MongoDB ObjectId",
        },
      },
      required: ['bookingId'],
    },
  },
  {
    name: 'book_ride',
    description: 'Book/request a new ride by providing pickup and destination address or landmark name.',
    input_schema: {
      type: 'object',
      properties: {
        pickupAddress: {
          type: 'string',
          description: 'The pickup location or landmark name',
        },
        destinationAddress: {
          type: 'string',
          description: 'The drop-off destination or landmark name',
        },
        rideType: {
          type: 'string',
          description: "Type of ride: 'economy', 'standard', or 'premium'. Default is 'standard'.",
        },
        paymentMethod: {
          type: 'string',
          description: "Payment method: 'cash' or 'online'. Default is 'cash'.",
        },
      },
      required: ['pickupAddress', 'destinationAddress'],
    },
  },
];

// Helper: geocode address using Mapbox
async function geocodeAddress(address) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const feat = data.features[0];
      return {
        address: feat.place_name || address,
        coordinates: feat.center, // [lng, lat]
      };
    }
  } catch (err) {
    console.warn('Mapbox geocoding error:', err.message || err);
  }
  return null;
}

// ---- 2. Real implementations — every one scoped to userId ----
async function getMyProfile(userId) {
  const user = await User.findById(userId).select('-password');
  if (!user) return { error: 'User not found' };
  return {
    name: user.name,
    email: user.email,
    phone: user.phone || 'Not provided',
    role: user.role,
    vehicle: user.vehicle || null,
    rating: user.rating || 5.0,
    isOnline: Boolean(user.isOnline),
  };
}

async function getMyBookings(userId) {
  const user = await User.findById(userId);
  const isDriver = user && user.role === 'driver';

  const query = isDriver
    ? { driver: userId }
    : { $or: [{ rider: userId }, { driver: userId }] };

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('rider', 'name phone')
    .populate('driver', 'name phone vehicle rating')
    .select('status fare distanceKm rideType createdAt pickup.address destination.address rider driver completedAt paymentMethod');
  return bookings;
}

async function getBooking(bookingId, userId) {
  const booking = await Booking.findById(bookingId)
    .populate('driver', 'name phone vehicle rating')
    .populate('rider', 'name phone');

  if (!booking) return { error: 'Booking not found' };

  // Ownership check — rider OR assigned driver can view it, nobody else
  const isRider = String(booking.rider?._id || booking.rider) === String(userId);
  const isDriver = booking.driver && String(booking.driver._id || booking.driver) === String(userId);

  if (!isRider && !isDriver) {
    return { error: 'Not authorized to view this booking' };
  }

  const obj = booking.toObject();
  if (!isRider) delete obj.otp;
  return obj;
}

async function getDriverStats(userId) {
  const driver = await User.findById(userId);
  if (!driver || driver.role !== 'driver') {
    return { error: 'Driver statistics are only available for driver accounts.' };
  }

  const allDriverBookings = await Booking.find({ driver: userId }).sort({ createdAt: -1 });
  const completedBookings = allDriverBookings.filter((b) => b.status === 'completed');
  const totalEarningsPaise = completedBookings.reduce((sum, b) => sum + (b.fare || 0), 0);

  const activeBooking = allDriverBookings.find((b) => ['accepted', 'started'].includes(b.status));

  return {
    driverName: driver.name,
    isOnline: Boolean(driver.isOnline),
    rating: driver.rating || 5.0,
    vehicle: driver.vehicle || 'Standard Vehicle',
    totalRidesAssigned: allDriverBookings.length,
    completedRides: completedBookings.length,
    totalEarningsRupees: (totalEarningsPaise / 100).toFixed(2),
    activeRide: activeBooking
      ? {
          bookingId: activeBooking._id.toString(),
          status: activeBooking.status,
          pickup: activeBooking.pickup?.address,
          destination: activeBooking.destination?.address,
          fareRupees: (activeBooking.fare / 100).toFixed(2),
          paymentMethod: activeBooking.paymentMethod,
        }
      : null,
  };
}

async function acceptIncomingRide(userId, bookingId) {
  const driver = await User.findById(userId);
  if (!driver || driver.role !== 'driver') {
    return { error: 'Only drivers can accept incoming ride requests.' };
  }

  let booking;
  if (bookingId) {
    booking = await Booking.findById(bookingId);
  } else {
    booking = await Booking.findOne({ status: 'requested' }).sort({ createdAt: -1 });
  }

  if (!booking) {
    return { error: 'No incoming ride request found to accept.' };
  }

  if (booking.status !== 'requested') {
    return { error: `Cannot accept this ride — it is already ${booking.status}.` };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  booking.driver = driver._id;
  booking.status = 'accepted';
  booking.otp = otp;
  booking.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await booking.save();

  try {
    const helpers = require('../socket').helpers || {};
    const payload = {
      bookingId: booking._id,
      driverId: driver._id,
      driverInfo: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicle: driver.vehicle,
        rating: driver.rating || 5.0,
      },
      fare: booking.fare,
      otp: booking.otp,
      status: booking.status,
      paymentMethod: booking.paymentMethod,
    };

    if (helpers.emitToUser) {
      helpers.emitToUser(booking.rider, 'ride:accepted', payload);
    }
    if (helpers.emitToRoom) {
      helpers.emitToRoom(`booking:${booking._id}`, 'ride:accepted', payload);
    }
  } catch (e) {
    console.warn('Socket emit on accept failed:', e.message);
  }

  return {
    success: true,
    bookingId: booking._id.toString(),
    pickup: booking.pickup?.address,
    destination: booking.destination?.address,
    fareRupees: (booking.fare / 100).toFixed(2),
    status: booking.status,
    otp: booking.otp,
  };
}

async function cancelBooking(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return { error: 'Booking not found' };

  const isRider = String(booking.rider) === String(userId);
  const isDriver = booking.driver && String(booking.driver) === String(userId);

  if (!isRider && !isDriver) {
    return { error: 'Only the rider or assigned driver can modify this ride' };
  }

  if (['started', 'completed', 'cancelled'].includes(booking.status)) {
    return { error: `Cannot cancel — ride is already ${booking.status}` };
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = isDriver ? 'cancelled by driver via AI copilot' : 'cancelled via AI copilot';
  await booking.save();

  try {
    const helpers = require('../socket').helpers || {};
    if (booking.driver) {
      helpers.emitToUser(booking.driver, 'driver:booking-cleared', {
        bookingId: booking._id,
      });
    }
    helpers.emitToUser(booking.rider, 'booking:cancelled', {
      bookingId: booking._id,
    });
  } catch (e) {
    /* ignore */
  }

  return { success: true, status: booking.status };
}

async function bookRide({ pickupAddress, destinationAddress, rideType = 'standard', paymentMethod = 'cash' }, userId) {
  if (!pickupAddress || !destinationAddress) {
    return { error: 'Both pickupAddress and destinationAddress are required to book a ride' };
  }

  const pickupGeo = await geocodeAddress(pickupAddress);
  if (!pickupGeo || !pickupGeo.coordinates) {
    return { error: `Could not resolve pickup location for: "${pickupAddress}". Please provide a more specific landmark or address.` };
  }

  const destGeo = await geocodeAddress(destinationAddress);
  if (!destGeo || !destGeo.coordinates) {
    return { error: `Could not resolve destination location for: "${destinationAddress}". Please provide a more specific landmark or address.` };
  }

  const [lng, lat] = pickupGeo.coordinates;
  const [dstLng, dstLat] = destGeo.coordinates;

  let distanceKm = 5;
  let estimatedTimeMin = 15;
  const token = process.env.MAPBOX_TOKEN;
  if (token) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${dstLng},${dstLat}?geometries=geojson&overview=full&access_token=${token}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d && d.routes && d.routes.length > 0) {
        const route = d.routes[0];
        distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        estimatedTimeMin = Math.max(1, Math.round(route.duration / 60));
      }
    } catch (e) {
      console.warn('Mapbox directions error:', e.message || e);
    }
  }

  const perKmRate = Number(process.env.PER_KM_RATE_RUPEES || 10);
  const perKmRatePaise = perKmRate * 100;
  let multiplier = 1.0;
  if (rideType === 'economy') multiplier = 0.8;
  if (rideType === 'premium') multiplier = 1.5;

  const computedFarePaise = Math.max(5000, Math.round(distanceKm * perKmRate * multiplier * 100));

  const { detectFareAnomaly } = require('./anomalyDetection.service');
  const { explainFare } = require('./fareInsight.service');

  const fareFlag = detectFareAnomaly({
    farePaise: computedFarePaise,
    distanceKm,
    perKmRatePaise,
    baseFarePaise: 0,
  });

  const fareExplanation = await explainFare({
    farePaise: computedFarePaise,
    distanceKm,
    perKmRatePaise,
    baseFarePaise: 0,
    surgeApplied: multiplier > 1,
  });

  const booking = await Booking.create({
    rider: userId,
    pickup: {
      address: pickupGeo.address,
      location: { type: 'Point', coordinates: [lng, lat] },
    },
    destination: {
      address: destGeo.address,
      location: { type: 'Point', coordinates: [dstLng, dstLat] },
    },
    rideType: rideType || 'standard',
    fare: computedFarePaise,
    distanceKm,
    estimatedTimeMin,
    paymentMethod: paymentMethod || 'cash',
    status: paymentMethod === 'online' ? 'pending_payment' : 'requested',
    fareExplanation,
    anomalyFlags: fareFlag ? [fareFlag] : [],
    createdAt: new Date(),
  });

  // Notify rider and nearby drivers via Socket.IO
  try {
    const helpers = require('../socket').helpers || {};
    const user = await User.findById(userId);

    const payload = {
      bookingId: booking._id,
      rider: { id: userId, name: user?.name || 'Rider' },
      pickup: booking.pickup,
      destination: booking.destination,
      fare: booking.fare,
      rideType: booking.rideType,
      distanceKm: booking.distanceKm,
      estimatedTimeMin: booking.estimatedTimeMin,
      paymentMethod: booking.paymentMethod,
    };

    if (helpers.emitToUser) {
      helpers.emitToUser(userId, 'booking:created', payload);
    }

    if (helpers.emitToRoom) {
      helpers.emitToRoom('drivers', 'ride:request', payload);
    }
  } catch (e) {
    console.warn('Socket emit on AI booking failed:', e.message);
  }

  return {
    success: true,
    bookingId: booking._id.toString(),
    pickup: booking.pickup.address,
    destination: booking.destination.address,
    fareRupees: (booking.fare / 100).toFixed(2),
    distanceKm: booking.distanceKm,
    estimatedTimeMin: booking.estimatedTimeMin,
    rideType: booking.rideType,
    paymentMethod: booking.paymentMethod,
    status: booking.status,
  };
}

// Dispatcher the agent loop calls
async function executeTool(name, input, userId) {
  switch (name) {
    case 'get_my_profile':
      return getMyProfile(userId);
    case 'get_my_bookings':
      return getMyBookings(userId);
    case 'get_booking':
      return getBooking(input.bookingId, userId);
    case 'get_driver_stats':
      return getDriverStats(userId);
    case 'accept_incoming_ride':
      return acceptIncomingRide(userId, input.bookingId);
    case 'cancel_booking':
      return cancelBooking(input.bookingId, userId);
    case 'book_ride':
      return bookRide(input, userId);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

module.exports = {
  toolDefinitions,
  executeTool,
};
