const eSewaService = require("./eSewaService");
const khaltiService = require("./khaltiService");

class PaymentGateway {
  constructor(provider) {
    if (!["esewa", "khalti"].includes(provider)) {
      throw new Error("Invalid payment provider");
    }
    this.provider = provider;
  }

  async initiatePayment(paymentData) {
    switch (this.provider) {
      case "esewa":
        return await eSewaService.initiatePayment(paymentData);
      case "khalti":
        return await khaltiService.initiatePayment(paymentData);
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
      default:
        throw new Error("Invalid payment provider");
    }
  }

  async handleWebhook(payload) {
    switch (this.provider) {
      case "esewa":
        return await eSewaService.handleWebhook(payload);
      case "khalti":
        return await khaltiService.handleWebhook(payload);
      default:
        throw new Error("Invalid payment provider");
    }
  }
}

module.exports = PaymentGateway;
