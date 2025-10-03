const Razorpay = require('razorpay');
const crypto = require('crypto');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createOrder = async ({ amount, currency='INR', receipt }) => {
  // amount in paise for INR
  const options = { amount, currency, receipt };
  return instance.orders.create(options);
};

exports.verifySignature = ({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) => {
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generated = hmac.digest('hex');
  return generated === razorpay_signature;
};
