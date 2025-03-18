import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Payment = () => {
  const [provider, setProvider] = useState("esewa");
  const [paymentUrl, setPaymentUrl] = useState("");
  const navigate = useNavigate();

  const handlePayment = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/payments/initiate",
        {
          provider,
          amount: 100, // Replace with actual amount
          userId: 123, // Current user's ID
          roomId: 25555, // Room ID from URL params
          returnUrl: "http://localhost:3000/payment-success",
        }
      );
      setPaymentUrl(response.data.paymentUrl);
      window.location.href = response.data.paymentUrl;
    } catch (error) {
      console.error("Payment error:", error);
    }
  };

  return (
    <div className="payment">
      <h1>Payment</h1>
      <select value={provider} onChange={(e) => setProvider(e.target.value)}>
        <option value="esewa">eSewa</option>
        <option value="khalti">Khalti</option>
        <option value="stripe">Stripe</option>
        <option value="paypal">PayPal</option>
      </select>
      <button onClick={handlePayment}>Proceed to Payment</button>
    </div>
  );
};

export default Payment;
