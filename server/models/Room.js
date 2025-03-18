const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  maxUsers: { type: Number, required: true },
  pricePerUser: { type: Number, required: true },
  currentUsers: { type: Number, default: 0 },
  status: { type: String, enum: ["open", "full", "closed"], default: "open" },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roomLink: { type: String, unique: true },
  videoSessionId: { type: String },
  isVideoActive: { type: Boolean, default: false }, // Tracks if video call is live
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  activeBreakoutRooms: [
    { type: mongoose.Schema.Types.ObjectId, ref: "BreakoutRoom" },
  ],
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

module.exports = mongoose.model("Room", roomSchema);
