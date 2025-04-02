import { io } from "socket.io-client";
import BASE_URL from "./config";

// Socket.IO client configuration
const userData = JSON.parse(localStorage.getItem("user"));
const userId = userData?.userId;
// console.log("User ID in socket.js:", userId);

const socket = io(BASE_URL, {
  auth: {
    userId: userId || null, // Send userId in the handshake
  },
  withCredentials: true,
  transports: ["websocket"],
});

// Log connection events
socket.on("connect", () => {
  // console.log("Socket.IO connected:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("Socket.IO connection error:", error);
});

socket.on("disconnect", (reason) => {
  console.log("Socket.IO disconnected:", reason);
});

export default socket;
