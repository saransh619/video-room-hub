const PaymentGateway = require("../services/payment/PaymentGateway");
const Payment = require("../models/Payment");

exports.initiatePayment = async (req, res) => {
  const { userId, roomId, amount, provider, returnUrl } = req.body;

  try {
    const paymentGateway = new PaymentGateway(provider);
    const paymentData = {
      amount,
      userId,
      returnUrl,
    };

    const paymentResponse = await paymentGateway.initiatePayment(paymentData);

    // Save payment details in the database
    const payment = new Payment({
      userId,
      roomId,
      amount,
      paymentId: paymentResponse.id || paymentResponse.payment_id,
      paymentGateway: provider,
      status: "pending",
    });
    await payment.save();

    res.status(200).json({ paymentUrl: paymentResponse.payment_url });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  const { paymentId, provider } = req.body;

  try {
    const paymentGateway = new PaymentGateway(provider);
    const paymentResponse = await paymentGateway.verifyPayment(paymentId);

    // Update payment status in the database
    const payment = await Payment.findOneAndUpdate(
      { paymentId },
      { status: paymentResponse.status === "success" ? "paid" : "failed" },
      { new: true }
    );

    // Update user's payment status
    const user = await User.findById(payment.userId);
    user.paymentStatus = "paid";
    await user.save();

    res.status(200).json({ paymentStatus: payment.status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
