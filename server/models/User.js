const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // role: { type: String, enum: ["user", "admin"], default: "user" },
  currentRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  currentBreakoutRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BreakoutRoom",
  },
  lastJoinedBreakoutRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BreakoutRoom",
  },
  status: {
    type: String,
    enum: ["inactive", "in-room", "in-breakout", "voted", "in-call"],
    default: "inactive",
  },
  completedPolls: [{ type: mongoose.Schema.Types.ObjectId, ref: "Poll" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
