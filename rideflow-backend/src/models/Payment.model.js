// const mongoose = require('mongoose');

// const PaymentSchema = new mongoose.Schema({
//   booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
//   razorpayOrderId: String,
//   razorpayPaymentId: String,
//   amount: Number,
//   currency: { type: String, default: 'INR' },
//   status: { type: String, enum: ['created','paid','failed'], default: 'created' },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Payment', PaymentSchema);
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  amount: Number,
  currency: String,
  status: { type: String, enum: ['created','paid','failed'], default: 'created' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
