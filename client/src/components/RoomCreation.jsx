import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const RoomCreation = () => {
  const [maxUsers, setMaxUsers] = useState(10);
  const [pricePerUser, setPricePerUser] = useState(5);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/rooms/create",
        {
          maxUsers,
          pricePerUser,
        }
      );
      alert(`Room created with ID: ${response.data.roomId}`);
      navigate(`/join-room?roomId=${response.data.roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  return (
    <div className="room-creation">
      <h1>Create Room</h1>
      <input
        type="number"
        value={maxUsers}
        onChange={(e) => setMaxUsers(Number(e.target.value))}
        placeholder="Max Users"
      />
      <input
        type="number"
        value={pricePerUser}
        onChange={(e) => setPricePerUser(Number(e.target.value))}
        placeholder="Price Per User"
      />
      <button onClick={handleCreateRoom}>Create Room</button>
    </div>
  );
};

export default RoomCreation;
