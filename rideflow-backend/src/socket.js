// // A small socket manager. Exports initSockets(server) and io/helpers (map user->socket)
// const jwt = require('jsonwebtoken');
// let io = null;
// const userSocketMap = new Map(); // userId -> socket.id

// function initSockets(server) {
//   const { Server } = require('socket.io');
//   io = new Server(server, {
//     cors: {
//       origin: process.env.CORS_ORIGIN || '*',
//       methods: ['GET','POST']
//     }
//   });

//   io.on('connection', async (socket) => {
//     // Expect token in handshake auth: { token }
//     try {
//       const token = socket.handshake.auth?.token;
//       if (!token) {
//         socket.disconnect();
//         return;
//       }
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       const userId = decoded.id;
//       socket.userId = userId;
//       // create a private room per user for direct emits
//       socket.join(`user:${userId}`);
//       userSocketMap.set(userId.toString(), socket.id);

//       console.log('Socket connected', userId, socket.id);

//       // join booking rooms on demand
//       socket.on('booking:join', ({ bookingId }) => {
//         if (!bookingId) return;
//         socket.join(`booking:${bookingId}`);
//       });

//       // driver/rider location events
//       socket.on('driver:location', ({ lng, lat, bookingId }) => {
//         if (!lng || !lat) return;
//         // broadcast to booking room if present
//         if (bookingId) {
//           io.to(`booking:${bookingId}`).emit('driver:location', { driverId: socket.userId, lng, lat });
//         } else {
//           io.to(`user:${socket.userId}`).emit('driver:location', { driverId: socket.userId, lng, lat });
//         }
//       });

//       socket.on('rider:location', ({ lng, lat, bookingId }) => {
//         if (!lng || !lat) return;
//         if (bookingId) {
//           io.to(`booking:${bookingId}`).emit('rider:location', { riderId: socket.userId, lng, lat });
//         } else {
//           io.to(`user:${socket.userId}`).emit('rider:location', { riderId: socket.userId, lng, lat });
//         }
//       });

//       // driver accepts booking via socket (optional)
//       socket.on('booking:accept', ({ bookingId }) => {
//         if (!bookingId) return;
//         io.to(`booking:${bookingId}`).emit('booking:accepted', { bookingId, driverId: socket.userId });
//       });

//       socket.on('disconnect', () => {
//         userSocketMap.delete(userId.toString());
//         console.log('Socket disconnected', userId);
//       });

//     } catch (e) {
//       console.error('Socket auth failed', e.message);
//       socket.emit('error', 'Authentication failed');
//       socket.disconnect();
//     }
//   });

//   // attach to exports
//   module.exports.io = io;
//   module.exports.helpers = {
//     getSocketIdByUserId: (userId) => userSocketMap.get(userId?.toString()),
//     emitToUser: (userId, evt, payload) => {
//       if (!io) return;
//       io.to(`user:${userId}`).emit(evt, payload);
//     }
//   };
// }

// module.exports = { initSockets, get io() { return module.exports.io; }, helpers: {} };
// backend/socket.js
const jwt = require("jsonwebtoken");
let io = null;
const userSocketMap = new Map(); // userId -> socket.id

function initSockets(server) {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        console.warn("Socket connected without token — disconnecting");
        return socket.disconnect();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      socket.userId = userId;
      // join a personal room so server can target this user's client(s)
      socket.join(`user:${userId}`);
      userSocketMap.set(userId.toString(), socket.id);

      console.log("✅ Socket connected:", userId, socket.id);

      // --- JOIN TYPES ---
      // Drivers join a shared drivers room so server can broadcast ride requests
      socket.on("driver:join", () => {
        socket.join("drivers");
        console.log(`🚗 Driver joined drivers room: ${userId}`);
      });

      // Riders call rider:join to register themselves (keeps parity)
      socket.on("rider:join", () => {
        socket.join("riders");
        console.log(`🧍 Rider joined riders room: ${userId}`);
      });

      // Allow clients to join a booking room to receive booking-specific events
      socket.on("join:booking", ({ bookingId }) => {
        if (!bookingId) return;
        socket.join(`booking:${bookingId}`);
        console.log(`🔐 Socket ${socket.id} joined booking:${bookingId}`);
      });

      // Allow clients to leave booking room when booking completes or on cancel
      socket.on("leave:booking", ({ bookingId }) => {
        if (!bookingId) return;
        try {
          socket.leave(`booking:${bookingId}`);
          console.log(`🔐 Socket ${socket.id} left booking:${bookingId}`);
        } catch (err) {
          console.warn('Error leaving booking room', err.message);
        }
      });

      // --- LOCATION STREAMS ---
      socket.on("driver:location", ({ lng, lat, bookingId }) => {
        if (!lng || !lat) return;
        // If bookingId present, forward to booking room (rider + driver in that room)
        if (bookingId) {
          io.to(`booking:${bookingId}`).emit("driver:location", {
            driverId: userId,
            lng,
            lat,
          });
        } else {
          // Optionally broadcast to all riders (or a more refined set) if no booking
          io.to("riders").emit("driver:location", {
            driverId: userId,
            lng,
            lat,
          });
        }
      });

      socket.on("rider:location", ({ lng, lat, bookingId }) => {
        if (!lng || !lat) return;
        if (bookingId) {
          io.to(`booking:${bookingId}`).emit("rider:location", {
            riderId: userId,
            lng,
            lat,
          });
        } else {
          io.to("drivers").emit("rider:location", {
            riderId: userId,
            lng,
            lat,
          });
        }
      });

      // --- RIDE REQUEST / ACCEPT FLOW ---
      socket.on("ride:request", (payload) => {
        // payload = { riderId, pickup, destination, bookingId, fare, ... }
        console.log("📩 New ride request:", payload);

        // Send to all drivers in drivers room
        // Drivers are expected to be listening for 'ride:request' or 'ride:incoming'
        io.to("drivers").emit("ride:request", payload);
      });

      socket.on("ride:accept", ({ riderId, driverId, bookingId, driverInfo }) => {
        console.log("✅ Ride accepted:", { riderId, driverId, bookingId });
        // Join the driver socket to the booking room for future driver<->rider updates
        try {
          if (bookingId) {
            socket.join(`booking:${bookingId}`);
          }
        } catch (err) {
          console.warn("Error joining booking room:", err.message);
        }

        // Notify the rider (using personal room) that driver accepted
        io.to(`user:${riderId}`).emit("ride:accepted", {
          driverId,
          bookingId,
          driverInfo: driverInfo || null,
        });

        // Also announce in booking room (in case rider already joined booking room)
        if (bookingId) {
          io.to(`booking:${bookingId}`).emit("ride:confirmed", {
            driverId,
            bookingId,
            driverInfo: driverInfo || null,
          });
        }
      });

      socket.on("disconnect", () => {
        userSocketMap.delete(userId.toString());
        console.log("❌ Socket disconnected", userId);
      });
    } catch (err) {
      console.error("Socket auth failed", err.message);
      socket.disconnect();
    }
  });

  return io;
}

// expose helpers so other modules can check socket state or emit to users
module.exports = {
  initSockets,
  helpers: {
    getSocketIdByUserId: (userId) => userSocketMap.get(userId?.toString()),
    isUserConnected: (userId) => userSocketMap.has(userId?.toString()),
    emitToUser: (userId, evt, payload) => {
      if (!io) return;
      io.to(`user:${userId}`).emit(evt, payload);
    },
    emitToRoom: (room, evt, payload) => {
      if (!io) return;
      io.to(room).emit(evt, payload);
    }
  },
};
