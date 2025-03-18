const eSewaService = require("./eSewaService");
const khaltiService = require("./khaltiService");
const stripeService = require("./stripeService");
const paypalService = require("./paypalService");

class PaymentGateway {
  constructor(provider) {
    this.provider = provider;
    if (!["esewa", "khalti", "stripe", "paypal"].includes(provider)) {
      throw new Error("Invalid payment provider");
    }
  }

  async initiatePayment(paymentData) {
    switch (this.provider) {
      case "esewa":
        return await eSewaService.initiatePayment(paymentData);
      case "khalti":
        return await khaltiService.initiatePayment(paymentData);
      case "stripe":
        return await stripeService.initiatePayment(paymentData);
      case "paypal":
        return await paypalService.initiatePayment(paymentData);
      default:
        throw new Error("Invalid payment provider");
    }
  }

  async verifyPayment(paymentId) {
    switch (this.provider) {
      case "esewa":
        return await eSewaService.verifyPayment(paymentId);
      case "khalti":
        return await khaltiService.verifyPayment(paymentId);
      case "stripe":
        return await stripeService.verifyPayment(paymentId);
      case "paypal":
        return await paypalService.verifyPayment(paymentId);
      default:
        throw new Error("Invalid payment provider");
    }
  }
}

module.exports = PaymentGateway;
