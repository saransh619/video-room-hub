const axios = require("axios");

const eSewaService = {
  initiatePayment: async (paymentData) => {
    const { amount, userId, returnUrl } = paymentData;

    const payload = {
      amount,
      tax_amount: 0,
      total_amount: amount,
      transaction_uuid: userId,
      product_code: "EPAYTEST",
      success_url: returnUrl,
      failure_url: returnUrl,
    };

    const response = await axios.post(
      "https://uat.esewa.com.np/api/epay/v2/initiate",
      payload
    );

    return response.data;
  },

  verifyPayment: async (paymentId) => {
    const response = await axios.get(
      `https://uat.esewa.com.np/api/epay/v2/transaction/${paymentId}`
    );

    return response.data;
  },
};

module.exports = eSewaService;
