// A small socket manager. Exports initSockets(server) and io/helpers (map user->socket)
const jwt = require('jsonwebtoken');
let io = null;
const userSocketMap = new Map(); // userId -> socket.id

function initSockets(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET','POST']
    }
  });

  io.on('connection', async (socket) => {
    // Expect token in handshake auth: { token }
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.disconnect();
        return;
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      socket.userId = userId;
      // create a private room per user for direct emits
      socket.join(`user:${userId}`);
      userSocketMap.set(userId.toString(), socket.id);

      console.log('Socket connected', userId, socket.id);

      // join booking rooms on demand
      socket.on('booking:join', ({ bookingId }) => {
        if (!bookingId) return;
        socket.join(`booking:${bookingId}`);
      });

      // driver/rider location events
      socket.on('driver:location', ({ lng, lat, bookingId }) => {
        if (!lng || !lat) return;
        // broadcast to booking room if present
        if (bookingId) {
          io.to(`booking:${bookingId}`).emit('driver:location', { driverId: socket.userId, lng, lat });
        } else {
          io.to(`user:${socket.userId}`).emit('driver:location', { driverId: socket.userId, lng, lat });
        }
      });

      socket.on('rider:location', ({ lng, lat, bookingId }) => {
        if (!lng || !lat) return;
        if (bookingId) {
          io.to(`booking:${bookingId}`).emit('rider:location', { riderId: socket.userId, lng, lat });
        } else {
          io.to(`user:${socket.userId}`).emit('rider:location', { riderId: socket.userId, lng, lat });
        }
      });

      // driver accepts booking via socket (optional)
      socket.on('booking:accept', ({ bookingId }) => {
        if (!bookingId) return;
        io.to(`booking:${bookingId}`).emit('booking:accepted', { bookingId, driverId: socket.userId });
      });

      socket.on('disconnect', () => {
        userSocketMap.delete(userId.toString());
        console.log('Socket disconnected', userId);
      });

    } catch (e) {
      console.error('Socket auth failed', e.message);
      socket.emit('error', 'Authentication failed');
      socket.disconnect();
    }
  });

  // attach to exports
  module.exports.io = io;
  module.exports.helpers = {
    getSocketIdByUserId: (userId) => userSocketMap.get(userId?.toString()),
    emitToUser: (userId, evt, payload) => {
      if (!io) return;
      io.to(`user:${userId}`).emit(evt, payload);
    }
  };
}

module.exports = { initSockets, get io() { return module.exports.io; }, helpers: {} };
