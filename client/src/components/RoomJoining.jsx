import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import BASE_URL from "../utils/config";
import "../styles/RoomJoining.css";

const RoomJoining = () => {
  const [roomId, setRoomId] = useState("");
  const [roomDetails, setRoomDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userStatus, setUserStatus] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRoomId = queryParams.get("roomId") || "";

  useEffect(() => {
    const fetchRoomDetailsAndStatus = async () => {
      const idToCheck = roomId || initialRoomId;
      if (!idToCheck) return;

      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        const userData = JSON.parse(localStorage.getItem("user"));
        const currentUserId = userData?.userId;

        if (!token) {
          navigate("/login", { state: { from: location } });
          return;
        }

        // Fetch room details
        const roomResponse = await axios.get(
          `${BASE_URL}/api/rooms/${idToCheck}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setRoomDetails(roomResponse.data);

        // Check user status without joining the room
        const statusResponse = await axios.get(
          `${BASE_URL}/api/rooms/${idToCheck}/check-status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // console.log("User status:", statusResponse.data);
        setUserStatus({
          ...statusResponse.data,
          isAdmin: roomResponse.data.creator._id === currentUserId,
        });
      } catch (error) {
        console.error("Error fetching room:", error);
        // alert(error.response?.data?.error || "Failed to load room details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetailsAndStatus();
  }, [roomId, initialRoomId, navigate, location]);

  const handleJoinRoom = async () => {
    const idToJoin = roomId || initialRoomId;
    if (!roomDetails) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (userStatus?.message === "Can join room" || userStatus?.isAdmin) {
        const joinResponse = await axios.post(
          `${BASE_URL}/api/rooms/${idToJoin}/join`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // console.log("Join response:", joinResponse.data);
        navigate("/video-call", {
          state: { roomId: idToJoin, isAdmin: userStatus.isAdmin },
        });
      } else {
        navigate(`/payment/${idToJoin}`, {
          state: {
            price: roomDetails.pricePerUser,
            maxUsers: roomDetails.maxUsers,
          },
        });
      }
    } catch (error) {
      console.error("Error joining room:", error);
      alert(error.response?.data?.error || "Failed to join room");
    } finally {
      setIsLoading(false);
    }
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
          <p>
            Available Slots: {roomDetails.maxUsers - roomDetails.currentUsers}
          </p>
          <button
            onClick={handleJoinRoom}
            disabled={
              isLoading || roomDetails.currentUsers >= roomDetails.maxUsers
            }
          >
            {isLoading
              ? "Processing..."
              : userStatus?.message === "Can join room" || userStatus?.isAdmin
              ? "Go to Room"
              : "Proceed to Payment"}
          </button>
        </div>
      ) : (
        <p>{isLoading ? "Loading room details..." : "Enter a room ID"}</p>
      )}
    </div>
  );
};

export default RoomJoining;
