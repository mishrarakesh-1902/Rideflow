const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const ctrl = require('../controllers/copilot.controller');

// Optional auth: parse and attach user if valid token exists, but allow guest visitors
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }
  const token = (authHeader.split(' ')[1]) || authHeader;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }
  next();
};

router.post('/chat', optionalAuth, ctrl.chat);

module.exports = router;
