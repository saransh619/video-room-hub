import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const RoomJoining = () => {
  const [roomId, setRoomId] = useState("");
  const [roomDetails, setRoomDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRoomId = queryParams.get("roomId") || "";

  useEffect(() => {
    const fetchRoomDetails = async () => {
      const idToCheck = roomId || initialRoomId;
      if (!idToCheck) return;

      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
          navigate("/login", { state: { from: location } });
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/api/rooms/${idToCheck}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setRoomDetails(response.data);
      } catch (error) {
        console.error("Error fetching room:", error);
        alert(error.response?.data?.error || "Failed to load room details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();
  }, [roomId, initialRoomId, navigate, location]);

  const handleJoinRoom = () => {
    const idToJoin = roomId || initialRoomId;
    if (!roomDetails) return;

    navigate(`/payment/${idToJoin}`, {
      state: {
        price: roomDetails.pricePerUser,
        maxUsers: roomDetails.maxUsers
      }
    });
  };

  return (
    <div className="room-joining">
      <h1>Join Room</h1>
      
      <input
        type="text"
        value={roomId || initialRoomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Room ID"
        disabled={isLoading}
      />

      {roomDetails ? (
        <div className="room-info">
          <p>Price: NPR {roomDetails.pricePerUser}</p>
          <p>Available Slots: {roomDetails.maxUsers - roomDetails.currentUsers}</p>
          <button 
            onClick={handleJoinRoom}
            disabled={isLoading || roomDetails.currentUsers >= roomDetails.maxUsers}
          >
            {isLoading ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>
      ) : (
        <p>{isLoading ? "Loading room details..." : "Enter a room ID"}</p>
      )}
    </div>
  );
};

export default RoomJoining;