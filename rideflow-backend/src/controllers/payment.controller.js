const razorpayService = require('../services/razorpay.service');
const Payment = require('../models/Payment.model');
const Booking = require('../models/Booking.model');
const User = require('../models/User.model');

exports.createOrder = async (req, res) => {
  const { bookingId, amount } = req.body; // amount in rupees
  if (!bookingId || !amount) return res.status(400).json({ message: 'Missing fields' });
  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  try {
    // amount should be in paise
    const order = await razorpayService.createOrder({ amount: Math.round(amount * 100), currency: 'INR', receipt: `rcpt_${bookingId}` });
    const payment = await Payment.create({ booking: booking._id, razorpayOrderId: order.id, amount: order.amount, currency: order.currency, status: 'created' });

    // attach temporary payment reference to booking (not final until verify)
    booking.payment = payment._id;
    await booking.save();

    res.json({ order, payment });
  } catch (err) {
    console.error('createOrder failed:', err.message || err);
    return res.status(500).json({ message: 'Payment service error', error: err.message });
  }
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

  // If booking was waiting for payment, mark it as requested and notify drivers
  if (booking.status === 'pending_payment') {
    booking.status = 'requested';
    await booking.save();

    // notify nearby drivers now that payment is done
    try {
      const helpers = require('../socket').helpers || {};
      const [lng, lat] = booking.pickup.location.coordinates;
      const nearbyDrivers = await User.find({
        role: 'driver',
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: 20000,
          },
        },
      }).limit(20).select('name phone vehicle rating location isOnline');

      const payload = {
        bookingId: booking._id,
        rider: { id: booking.rider, name: '' },
        pickup: booking.pickup,
        destination: booking.destination,
        fare: booking.fare,
        rideType: booking.rideType,
      };

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
    } catch (err) {
      console.warn('⚠️ notify drivers after payment failed', err.message || err);
    }
  } else {
    await booking.save();
  }

  res.json({ ok: true, payment });
};
