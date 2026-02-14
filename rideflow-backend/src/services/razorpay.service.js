const Razorpay = require('razorpay');
const crypto = require('crypto');

function getInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not set (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

exports.createOrder = async ({ amount, currency='INR', receipt }) => {
  // amount in paise for INR
  const options = { amount, currency, receipt };
  const instance = getInstance();
  return instance.orders.create(options);
};

exports.verifySignature = ({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error('Razorpay secret not configured');
  }
  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generated = hmac.digest('hex');
  return generated === razorpay_signature;
};
