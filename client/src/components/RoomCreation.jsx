import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../utils/config";
import "../styles/RoomCreation.css";

const RoomCreation = () => {
  const [maxUsers, setMaxUsers] = useState("");
  const [pricePerUser, setPricePerUser] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [roomLink, setRoomLink] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const maxUsersValue = maxUsers ? Number(maxUsers) : 0;
      const pricePerUserValue = pricePerUser ? Number(pricePerUser) : 0;

      if (maxUsersValue <= 0 || pricePerUserValue < 0) {
        alert(
          "Please enter a valid number of users (greater than 0) and a non-negative price."
        );
        return;
      }

      const response = await axios.post(
        `${BASE_URL}/api/rooms/create`,
        {
          maxUsers: maxUsersValue,
          pricePerUser: pricePerUserValue,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRoomId(response.data.roomId);
      setRoomLink(response.data.roomLink);
    } catch (error) {
      console.error("Error creating room:", error);
      alert(error.response?.data?.error || "Failed to create room");
    }
  };

  const handleCopyToClipboard = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleGoToRoom = () => {
    if (roomId) {
      navigate(`/join-room?roomId=${roomId}`);
    }
  };

  return (
    <div className="room-creation">
      <h1>Create Room</h1>
      {!roomId ? (
        <>
          <input
            type="number"
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
            placeholder="Max Users"
          />
          <input
            type="number"
            value={pricePerUser}
            onChange={(e) => setPricePerUser(e.target.value)}
            placeholder="Price Per User"
          />
          <button onClick={handleCreateRoom}>Create Room</button>
        </>
      ) : (
        <div className="room-created">
          <p>Room created successfully!</p>
          <p>
            Room ID: <span className="room-id">{roomId}</span>
          </p>
          <button onClick={handleCopyToClipboard} className="copy-button">
            Copy Room ID
          </button>
          <p>
            Shareable Link:{" "}
            <a href={roomLink} target="_blank" rel="noopener noreferrer">
              {roomLink}
            </a>
          </p>
          <button onClick={handleGoToRoom} className="go-to-room-button">
            Go to Room
          </button>
          {copied && (
            <div className="notification">Room ID copied to clipboard!</div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomCreation;
