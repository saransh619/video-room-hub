const axios = require("axios");

module.exports = {
  initiatePayment: async ({
    amount,
    userId,
    returnUrl,
    failureUrl,
    roomId,
  }) => {
    const payload = {
      amount,
      tax_amount: 0,
      total_amount: amount,
      transaction_uuid: `${userId}_${Date.now()}`,
      product_code: `room_${roomId}`,
      success_url: `${returnUrl}?roomId=${roomId}`,
      failure_url: `${failureUrl}?roomId=${roomId}`,
    };
    console.log("esewa payload", payload);

    try {
      const response = await axios.post(
        process.env.ESEWA_PAYMENT_URL,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return {
        payment_url: response.data.payment_url,
        transaction_uuid: payload.transaction_uuid,
      };
    } catch (error) {
      console.error("eSewa Payment Error:", error.response?.data);
      throw error;
    }
  },

  verifyPayment: async (transaction_uuid) => {
    const response = await axios.get(
      `${process.env.ESEWA_PAYMENT_STATUS_CHECK_URL}?transaction_uuid=${transaction_uuid}`
    );

    return {
      status: response.data.status === "COMPLETE" ? "paid" : "failed",
      amount: response.data.total_amount,
    };
  },

  handleWebhook: async (payload) => {
    return {
      paymentId: payload.transaction_uuid,
      status: payload.status === "COMPLETE" ? "paid" : "failed",
      userId: payload.transaction_uuid.split("_")[0], // Extract from UUID
      roomId: payload.product_code,
    };
  },
};
