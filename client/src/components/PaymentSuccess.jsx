import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import BASE_URL from "../utils/config";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const hasJoined = useRef(false);

  useEffect(() => {
    const verifyPayment = async () => {
      if (hasJoined.current) return; // Skip if already joined
      let params;
      try {
        const token = localStorage.getItem("token");
        const userData = JSON.parse(localStorage.getItem("user"));
        const currentUserId = userData?.userId;

        if (!token || !currentUserId) {
          throw new Error("Authentication required");
        }

        // Get the full URL
        const fullUrl = window.location.href;
        console.log("Full URL:", fullUrl);

        // Fix malformed URL by replacing ? with & for second parameter
        const fixedUrl = fullUrl.replace(/(\?roomId=.*?)\?/, "$1&");
        const urlObj = new URL(fixedUrl);
        params = new URLSearchParams(urlObj.search);

        // Get parameters
        const pidx = params.get("pidx");
        const roomId = params.get("roomId");
        if (!pidx || !roomId) throw new Error("Missing payment or room ID");

        // Verify payment
        const { data: verification } = await axios.post(
          `${BASE_URL}/api/payments/verify`,
          { pidx, roomId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!verification.success) {
          throw new Error("Payment verification failed");
        }

        // Join room
        if (!hasJoined.current) {
          await axios.post(
            `${BASE_URL}/api/rooms/${roomId}/join`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          hasJoined.current = true;
        }

        // Get updated room details
        const { data: updatedRoom } = await axios.get(
          `${BASE_URL}/api/rooms/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        navigate("/video-call", {
          state: {
            roomId,
            isAdmin: updatedRoom.creator._id === currentUserId,
          },
        });
      } catch (error) {
        console.error("Payment error:", error);
        navigate("/payment-failure", {
          state: {
            error: error.message,
            roomId: params.get("roomId"),
          },
        });
      }
    };

    verifyPayment();
  }, [navigate]);

  return (
    <div className="payment-status">
      <h1>Payment Successful!</h1>
      <p>Verifying your payment and redirecting to the video room...</p>
    </div>
  );
}
