const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  paymentId: { type: String },
  paymentGateway: { type: String, required: true },
  paymentUrl: String,
  gatewayResponse: { type: Object },
  retryCount: {
    type: Number,
    default: 0,
    validate: {
      validator: function (v) {
        return v >= 0 && v <= 3;
      },
      message: "Retry count must be between 0 and 3",
    },
  }, // max 3 retries
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60 * 1000),
  }, // Auto-expires after 15 min
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
