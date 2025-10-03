// src/services/socket.ts
import { io, Socket } from "socket.io-client";
import { API_BASE } from "./api";

let socket: Socket | null = null;

export function initSocket() {
  if (socket) return socket;
  // We use same origin (server should host socket.io on same server or CORS allowed)
  const url = (API_BASE || "http://localhost:5000").replace(/\/api$/, "");
  socket = io(url, {
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect_error", err);
  });

  socket.on("connect", () => {
    console.log("Socket connected", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected", reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
