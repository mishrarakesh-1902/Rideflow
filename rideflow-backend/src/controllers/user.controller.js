const User = require('../models/User.model');

exports.getAll = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

exports.getOne = async (req, res) => {
  const u = await User.findById(req.params.id).select('-password');
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json(u);
};

exports.updateMe = async (req, res) => {
  const updates = (({ name, phone }) => ({ name, phone }))(req.body);
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
  res.json(user);
};
