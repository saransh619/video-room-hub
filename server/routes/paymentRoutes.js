const express = require("express");
const paymentController = require("../controllers/paymentController");

const router = express.Router();

router.post("/initiate", paymentController.initiatePayment);
router.post("/verify", paymentController.verifyPayment);

module.exports = router;
