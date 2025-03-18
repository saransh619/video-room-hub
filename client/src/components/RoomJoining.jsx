import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const RoomJoining = () => {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRoomId = queryParams.get("roomId") || "";

  const handleJoinRoom = async () => {
    if (!roomId && !initialRoomId) {
      alert("Please enter a Room ID");
      return;
    }
    const idToJoin = roomId || initialRoomId;
    try {
      const response = await axios.post(
        `http://localhost:5000/api/rooms/${idToJoin}/join`
      );
      alert(response.data.message);
      navigate("/video-call");
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room. Please check the Room ID and try again.");
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
      />
      <button onClick={handleJoinRoom}>Join Room</button>
    </div>
  );
};

export default RoomJoining;
