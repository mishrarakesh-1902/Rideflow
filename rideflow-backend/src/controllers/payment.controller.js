const razorpayService = require('../services/razorpay.service');
const Payment = require('../models/Payment.model');
const Booking = require('../models/Booking.model');

exports.createOrder = async (req, res) => {
  const { bookingId, amount } = req.body; // amount in rupees
  if (!bookingId || !amount) return res.status(400).json({ message: 'Missing fields' });
  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  // amount should be in paise
  const order = await razorpayService.createOrder({ amount: Math.round(amount * 100), currency: 'INR', receipt: `rcpt_${bookingId}` });
  const payment = await Payment.create({ booking: booking._id, razorpayOrderId: order.id, amount: order.amount, currency: order.currency, status: 'created' });
  res.json({ order, payment });
};

exports.verifyPayment = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  const ok = razorpayService.verifySignature({ razorpay_payment_id, razorpay_order_id, razorpay_signature });
  if (!ok) return res.status(400).json({ message: 'Invalid signature' });
  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.status = 'paid';
  await payment.save();

  const booking = await Booking.findById(payment.booking);
  booking.payment = payment._id;
  await booking.save();
  res.json({ ok: true, payment });
};
