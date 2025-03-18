const mongoose = require("mongoose");

const breakoutRoomSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reInvitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  timer: { type: Number, default: 120 },
  status: {
    type: String,
    enum: ["pending", "active", "completed"],
    default: "pending",
  },
  quizQuestions: {
    type: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: String, required: true },
      },
    ],
    validate: {
      validator: function (v) {
        return v.length === 5;
      },
      message: "A breakout room must have exactly 5 quiz questions",
    },
  },
  completedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  endedAt: { type: Date },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 2 * 60 * 1000),
  }, // Auto-expires after 2 min
});

module.exports = mongoose.model("BreakoutRoom", breakoutRoomSchema);
