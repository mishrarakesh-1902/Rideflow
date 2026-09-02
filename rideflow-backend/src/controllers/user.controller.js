const User = require('../models/User.model');

exports.getAll = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('-password');
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, phone, vehicle } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (vehicle !== undefined) updates.vehicle = vehicle.trim();

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ user, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('updateMe error:', err);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};
