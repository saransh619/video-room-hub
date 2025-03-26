import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

const Payment = () => {
  const [provider, setProvider] = useState("esewa");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();

  // Get room price from location state or fetch it
  const roomPrice = location.state?.price || 0;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/payments/initiate",
        { roomId, provider },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.isExisting) {
        toast.info("Resuming previous payment session");
      }
      window.location.href = response.data.paymentUrl;
    } catch (error) {
      toast.error(error.response?.data?.error || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Check for payment return (in case user comes back manually)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("pidx") || params.has("transaction_uuid")) {
      navigate("/payment-success", { state: { roomId } });
    }
  }, [navigate, roomId]);

  return (
    <div className="payment-container">
      <h2>Complete Payment</h2>
      <div className="payment-card">
        <div className="payment-details">
          <p>Room Access Fee: NPR {roomPrice}</p>
          <p>Please select payment method:</p>

          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="payment-select"
            disabled={isProcessing}
          >
            <option value="esewa">eSewa</option>
            <option value="khalti">Khalti</option>
          </select>

          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="payment-button"
          >
            {isProcessing ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>

        <div className="payment-instructions">
          <h3>Payment Instructions:</h3>
          {provider === "esewa" && (
            <ol>
              <li>You'll be redirected to eSewa</li>
              <li>Login to your eSewa account</li>
              <li>Confirm payment of NPR {roomPrice}</li>
              <li>You'll be automatically returned after payment</li>
            </ol>
          )}
          {provider === "khalti" && (
            <ol>
              <li>You'll be redirected to Khalti</li>
              <li>Complete the payment using Khalti PIN</li>
              <li>Payment will be verified automatically</li>
              <li>You'll gain immediate room access</li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payment;
