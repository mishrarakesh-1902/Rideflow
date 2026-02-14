// const mongoose = require('mongoose');

// const BookingSchema = new mongoose.Schema({
//   rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
//   pickup: {
//     address: String,
//     coords: { type: [Number] } // [lng, lat]
//   },
//   destination: {
//     address: String,
//     coords: { type: [Number] }
//   },
//   status: { type: String, enum: ['requested','accepted','ongoing','completed','cancelled'], default: 'requested' },
//   rideType: { type: String, enum: ['economy','standard','premium'], default: 'standard' },
//   fare: { type: Number, default: 0 },
//   distanceKm: { type: Number, default: 0 },
//   estimatedTimeMin: { type: Number, default: 0 },
//   payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Booking', BookingSchema);
const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true } // [lng, lat]
});

const bookingSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickup: {
    address: String,
    location: pointSchema
  },
  destination: {
    address: String,
    location: pointSchema
  },
  status: {
    type: String,
    enum: ['requested', 'pending_payment', 'accepted', 'started', 'completed', 'cancelled'],
    default: 'requested'
  },
  fare: { type: Number, default: 0 },
  distanceKm: { type: Number, default: 0 },
  estimatedTimeMin: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  otp: { type: String },
  otpExpiresAt: Date,
  otpVerified: { type: Boolean, default: false },
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  paymentMethod: { type: String, enum: ['online', 'cash'], default: 'online' }
});

bookingSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
