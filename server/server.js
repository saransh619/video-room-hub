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
const tokenRoutes = require("./routes/tokenRoutes");

const https = require("https");
const socketIo = require("socket.io");
const fs = require("fs");

const dotenv = require("dotenv");
dotenv.config();

const app = express();

// Load SSL certificate and key
const httpsOptions = {
  key: fs.readFileSync("./certs/key.pem"),
  cert: fs.readFileSync("./certs/cert.pem"),
};

const server = https.createServer(httpsOptions, app);

// Allow specific origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://192.168.1.68:5173",
  "https://localhost:5173",
  "https://192.168.1.68:5173",
];

// Socket.IO CORS configuration
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

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
app.use("/api", tokenRoutes);

// Initialize WebRTC Signaling and Socket Events
socketHandler(io);

// Log Socket.IO connections
io.on("connection", (socket) => {
  console.log(
    `New Socket.IO connection: ${socket.id}, userId: ${socket.handshake.auth.userId}`
  );
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
