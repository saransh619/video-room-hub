const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const roomRoutes = require("./routes/roomRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const breakoutRoutes = require("./routes/breakoutRoutes");
const pollRoutes = require("./routes/pollRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const socketHandler = require("./socket/socketHandler");

const http = require("http");
const socketIo = require("socket.io");

const dotenv = require("dotenv");
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/breakout", breakoutRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/users", userRoutes);

// Initialize WebRTC Signaling and Socket Events
socketHandler(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
