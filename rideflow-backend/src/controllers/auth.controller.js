const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const signToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, role, vehicle } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, phone, role: role || 'rider', vehicle });
    const token = signToken(user);
    const safe = { _id: user._id, name: user.name, email: user.email, role: user.role };
    res.json({ user: safe, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    const safe = { _id: user._id, name: user.name, email: user.email, role: user.role, isOnline: user.isOnline };
    res.json({ user: safe, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

exports.me = async (req, res) => {
  const user = req.user;
  res.json({ user });
};
