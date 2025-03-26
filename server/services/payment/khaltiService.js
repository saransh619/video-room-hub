const axios = require("axios");

module.exports = {
  initiatePayment: async ({ amount, userId, returnUrl, roomId }) => {
    try {
      // Encode parameters to ensure proper URL formatting
      const cleanReturnUrl = returnUrl.split("?")[0];
      const encodedParams = new URLSearchParams();
      encodedParams.append("roomId", roomId);

      const response = await axios.post(
        process.env.KHALTI_PAYMENT_URL,
        {
          return_url: `${cleanReturnUrl}?${encodedParams.toString()}`,
          website_url: process.env.CLIENT_URL,
          amount: amount * 100, // Convert NPR to paisa for Khalti
          purchase_order_id: `room_${roomId}_${userId}_${Date.now()}`,
          purchase_order_name: "Video Room Access",
        },
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          },
        }
      );

      return {
        payment_url: response.data.payment_url,
        pidx: response.data.pidx,
      };
    } catch (error) {
      console.error("Khalti Error:", error.response?.data);
      throw error;
    }
  },

  verifyPayment: async (pidx) => {
    try {
      const response = await axios.post(
        process.env.KHALTI_VERIFICATION_URL,
        { pidx },
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        status: response.data.status === "Completed" ? "paid" : "failed",
        amount: response.data.total_amount / 100, // Convert paisa to NPR
        transaction: response.data,
      };
    } catch (error) {
      console.error("Khalti verification error:", error.response?.data);
      return {
        status: "failed",
        amount: 0,
      };
    }
  },

  handleWebhook: async (payload) => {
    try {
      // Extract from Khalti's webhook payload
      const status = payload.status === "Completed" ? "paid" : "failed";
      const [_, roomId, userId] = payload.purchase_order_id.split("_");

      return {
        paymentId: payload.pidx,
        status,
        userId,
        roomId,
      };
    } catch (error) {
      console.error("Webhook processing error:", error);
      throw error;
    }
  },
};
