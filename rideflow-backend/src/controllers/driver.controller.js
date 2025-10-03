const User = require('../models/User.model');
const { ioGetSocketByUserId, ioEmitToUser } = require('../socket').helpers || {};

exports.patchLocation = async (req, res) => {
  // body: { lng, lat }
  const { lng, lat } = req.body;
  if (typeof lng !== 'number' || typeof lat !== 'number')
    return res.status(400).json({ message: 'Invalid coordinates' });

  const user = req.user;
  if (user.role !== 'driver') return res.status(403).json({ message: 'Only drivers can update location' });

  const driver = await User.findById(user._id);
  driver.location = { type: 'Point', coordinates: [lng, lat] };
  await driver.save();

  // Emit to socket room(s) — either to client's own socket or booking room(s)
  try {
    const { io } = require('../socket');
    // if driver is connected, emit updated location
    io.to(`user:${driver._id}`).emit('driver:location', { driverId: driver._id, lng, lat });
    // If driver has an active booking, also emit to booking room — booking logic is in bookingController
  } catch (e) {
    // ignore
  }

  res.json({ ok: true, location: driver.location });
};

exports.toggleStatus = async (req, res) => {
  const user = req.user;
  if (user.role !== 'driver') return res.status(403).json({ message: 'Only drivers' });
  const driver = await User.findById(user._id);
  driver.isOnline = !driver.isOnline;
  await driver.save();
  // notify via socket
  try {
    const { io } = require('../socket');
    io.to(`user:${driver._id}`).emit('driver:status', { isOnline: driver.isOnline });
  } catch (e) {}
  res.json({ isOnline: driver.isOnline });
};
