const axios = require("axios");

const khaltiService = {
  initiatePayment: async (paymentData) => {
    const { amount, userId, returnUrl } = paymentData;

    const response = await axios.post(
      "https://khalti.com/api/v2/payment/initiate/",
      {
        amount,
        userId,
        return_url: returnUrl,
      },
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  },

  verifyPayment: async (paymentId) => {
    const response = await axios.post(
      "https://api.khalti.com/v1/payments/verify",
      {
        payment_id: paymentId,
      },
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  },
};

module.exports = khaltiService;
