const Payment = require("../models/Payment");
const User = require("../models/User");
const Room = require("../models/Room");
const PaymentGateway = require("../services/payment/PaymentGateway");

exports.initiatePayment = async (req, res) => {
  const { roomId, provider } = req.body;
  const userId = req.user.userId;
  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });

    // Check for existing pending payment
    const existingPayment = await Payment.findOne({
      userId,
      roomId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (existingPayment) {
      return res.json({
        isExisting: true,
        paymentUrl: existingPayment.paymentUrl,
      });
    }

    const paymentGateway = new PaymentGateway(provider);
    const paymentData = {
      amount: room.pricePerUser, // Store in NPR
      userId,
      roomId,
      returnUrl: `${process.env.PAYMENT_SUCCESS_URL}?roomId=${roomId}`,
      failureUrl: `${process.env.PAYMENT_FAILURE_URL}?roomId=${roomId}`,
    };
    // console.log("payment data", paymentData);

    const paymentResponse = await paymentGateway.initiatePayment(paymentData);
    // console.log("payment response", paymentResponse);

    // Save payment record
    const payment = new Payment({
      userId,
      roomId,
      amount: room.pricePerUser, // Store in NPR
      paymentId: paymentResponse.pidx || paymentResponse.transaction_uuid,
      paymentGateway: provider,
      paymentUrl: paymentResponse.payment_url,
      status: "pending",
    });
    // console.log("payment from controller", payment);
    await payment.save();

    res.json({
      paymentUrl: paymentResponse.payment_url,
      paymentId: payment._id,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  const { pidx, roomId } = req.body;
  // console.log("Verification request:", { pidx, roomId });

  try {
    if (!pidx) {
      return res.status(400).json({ error: "Missing payment ID" });
    }

    // Verify with Khalti
    const paymentGateway = new PaymentGateway("khalti");
    const verification = await paymentGateway.verifyPayment(pidx);

    // console.log("Verification result:", verification);

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { paymentId: pidx },
      {
        status: verification.status,
        gatewayResponse: verification.transaction,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    // Update user status if payment succeeded
    if (verification.status === "paid") {
      await User.findByIdAndUpdate(req.user.userId, {
        $addToSet: { paidRooms: roomId },
        updatedAt: new Date(),
      });
    }

    res.json({
      success: verification.status === "paid",
      paymentStatus: verification.status,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(400).json({
      error: error.message,
      details: error.response?.data,
    });
  }
};

exports.paymentWebhook = async (req, res) => {
  const provider = req.params.provider;
  const payload = req.body;

  try {
    const paymentGateway = new PaymentGateway(provider);
    const webhookResult = await paymentGateway.handleWebhook(payload);

    await Payment.findOneAndUpdate(
      { paymentId: webhookResult.paymentId },
      { status: webhookResult.status },
      { new: true }
    );

    if (webhookResult.status === "paid") {
      await User.findByIdAndUpdate(webhookResult.userId, {
        paymentStatus: "paid",
        $addToSet: { paidRooms: webhookResult.roomId },
      });
    }

    res.status(200).send("Webhook processed");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).send("Webhook processing failed");
  }
};
