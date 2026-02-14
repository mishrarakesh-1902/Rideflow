// const jwt = require('jsonwebtoken');
// const User = require('../models/User.model');

// const auth = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'No token provided' });
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id).select('-password');
//     if (!user) return res.status(401).json({ message: 'User not found' });
//     req.user = user;
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: 'Invalid token', error: err.message });
//   }
// };

// module.exports = auth;


const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    console.warn('🔒 auth.middleware: missing Authorization header');
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = (authHeader.split(' ')[1]) || authHeader;
  console.log('🔐 auth.middleware: token extracted', token ? '[REDACTED]' : null);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 auth.middleware: token decoded, id=', decoded.id);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.warn('🔒 auth.middleware: user not found for id', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.warn('🔒 auth.middleware: invalid token', err.message);
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};
