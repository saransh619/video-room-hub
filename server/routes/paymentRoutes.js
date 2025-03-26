const express = require("express");
const paymentController = require("../controllers/paymentController");
const { authUser } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/initiate", authUser, paymentController.initiatePayment);
router.post("/verify", authUser, paymentController.verifyPayment);
router.post("/webhook/:provider", paymentController.paymentWebhook);

module.exports = router;
