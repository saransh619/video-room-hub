// const Stripe = require("stripe");
// const dotenv = require("dotenv");
// dotenv.config();

// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// const stripeService = {
//   initiatePayment: async (paymentData) => {
//     const { amount, currency, description } = paymentData;

//     const paymentIntent = await stripe.paymentIntents.create({
//       amount,
//       currency,
//       description,
//     });

//     return paymentIntent;
//   },

//   verifyPayment: async (paymentId) => {
//     const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

//     return {
//       status: paymentIntent.status === "succeeded" ? "paid" : "failed",
//       paymentIntent,
//     };
//   },
// };

// module.exports = stripeService;
