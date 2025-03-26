import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "react-toastify";

export default function PaymentFailure() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get both error message and roomId from state
  const errorMessage = location.state?.error;
  const roomId = location.state?.roomId;

  // Show error toast if available
  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);

  const handleRetry = () => {
    if (roomId) {
      navigate(`/payment/${roomId}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="payment-status error">
      <h1>Payment Failed</h1>
      <p>{errorMessage || "Your payment could not be processed."}</p>
      <button onClick={handleRetry} className="retry-button">
        {roomId ? "Try Payment Again" : "Return Home"}
      </button>
    </div>
  );
}