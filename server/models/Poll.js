const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v.length === 4;
      },
      message: "A poll must have exactly 4 options",
    },
  },
  votes: { type: [Number], default: [0, 0, 0, 0] },
  totalVotes: { type: Number, default: 0 },
  breakoutRoomId: { type: mongoose.Schema.Types.ObjectId, ref: "BreakoutRoom" },
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
});

// Auto-update totalVotes before saving
pollSchema.pre("save", function (next) {
  this.totalVotes = this.votes.reduce((sum, val) => sum + val, 0);
  next();
});

module.exports = mongoose.model("Poll", pollSchema);
