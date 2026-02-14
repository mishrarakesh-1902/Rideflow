// // src/services/socket.ts
// import { io, Socket } from "socket.io-client";
// import { API_BASE } from "./api";

// let socket: Socket | null = null;

// export function initSocket() {
//   if (socket) return socket;
//   // We use same origin (server should host socket.io on same server or CORS allowed)
//   const url = (API_BASE || "http://localhost:5000").replace(/\/api$/, "");
//   socket = io(url, {
//     transports: ["websocket"],
//     autoConnect: true,
//   });

//   socket.on("connect_error", (err) => {
//     console.error("Socket connect_error", err);
//   });

//   socket.on("connect", () => {
//     console.log("Socket connected", socket?.id);
//   });

//   socket.on("disconnect", (reason) => {
//     console.log("Socket disconnected", reason);
//   });

//   return socket;
// }

// export function getSocket() {
//   return socket;
// }

// export function disconnectSocket() {
//   if (socket) {
//     socket.disconnect();
//     socket = null;
//   }
// }
// // src/services/socket.ts
// import { io, Socket } from "socket.io-client";
// import { API_BASE } from "./api";

// let socket: Socket | null = null;

// /**
//  * Initializes the Socket.IO client instance with authentication
//  * and reconnect logic. Returns the socket reference.
//  */
// export function initSocket(): Socket {
//   if (socket && socket.connected) return socket;

//   const baseURL = (API_BASE || "http://localhost:5000").replace(/\/api$/, "");
//   const token = localStorage.getItem("token");

//   socket = io(baseURL, {
//     transports: ["websocket"], // Faster and more reliable
//     autoConnect: true,
//     reconnection: true,
//     reconnectionAttempts: 5,
//     reconnectionDelay: 2000,
//     auth: { token },
//   });

//   socket.on("connect", () => {
//     console.log("✅ Socket connected:", socket?.id);
//   });

//   socket.on("disconnect", (reason) => {
//     console.warn("❌ Socket disconnected:", reason);
//   });

//   socket.on("connect_error", (err) => {
//     console.error("⚠️ Socket connection error:", err.message);
//     // If token expired, try refreshing auth header on next connect
//   });

//   return socket;
// }

// /**
//  * Returns the existing socket instance.
//  */
// export function getSocket(): Socket | null {
//   return socket;
// }


// frontend/src/services/socket.ts
import { io, Socket } from "socket.io-client";
import { API_BASE } from "./api";

let socket: Socket | null = null;

export function initSocket() {
  if (socket) return socket;
  // API_BASE is like "http://localhost:5000/api" => remove trailing /api for socket origin
  const origin = (API_BASE || "http://localhost:5000").replace(/\/api\/?$/i, "");
  const token = localStorage.getItem("token") || null;

  socket = io(origin, {
    auth: { token }, // server should validate handshake via socket.handshake.auth.token
    transports: ["websocket"],
  });

  return socket;
}

export function getSocket() {
  return socket;
}
