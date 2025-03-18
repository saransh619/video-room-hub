const paypal = require("@paypal/checkout-server-sdk");

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const client = new paypal.core.PayPalHttpClient(environment);

const paypalService = {
  initiatePayment: async (paymentData) => {
    const { amount, currency, returnUrl, cancelUrl } = paymentData;

    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
          },
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    });

    const response = await client.execute(request);
    return response.result;
  },

  verifyPayment: async (paymentId) => {
    const request = new paypal.orders.OrdersGetRequest(paymentId);
    const response = await client.execute(request);
    return response.result;
  },
};

module.exports = paypalService;
