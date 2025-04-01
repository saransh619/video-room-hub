import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import BASE_URL from "../utils/config";

const BreakoutRoom = () => {
  const [breakoutRoomId, setBreakoutRoomId] = useState("");
  const [users, setUsers] = useState([]);
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Fetch users for the room
  useEffect(() => {
    if (!roomId) {
      alert("Room ID is missing. Redirecting to home page.");
      navigate("/");
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await axios.get(
          `${BASE_URL}/api/rooms/${roomId}/users`
        );
        setUsers(response.data.users);
      } catch (error) {
        console.error("Error fetching users:", error);
        alert("Failed to fetch users. Please check the Room ID and try again.");
      }
    };
    fetchUsers();
  }, [roomId, navigate]);

  const handleCreateBreakoutRoom = async () => {
    if (!roomId) {
      alert("Room ID is missing. Please provide a valid Room ID.");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/api/breakout/create`, {
        roomId,
        users: users.map((user) => user._id),
      });
      setBreakoutRoomId(response.data.breakoutRoomId);
      alert(`Breakout room created with ID: ${response.data.breakoutRoomId}`);
    } catch (error) {
      console.error("Error creating breakout room:", error);
      alert(
        "Failed to create breakout room. Please check the data and try again."
      );
    }
  };

  return (
    <div className="breakout-room">
      <h1>Breakout Room</h1>
      <button onClick={handleCreateBreakoutRoom}>Create Breakout Room</button>
      {breakoutRoomId && <p>Breakout Room ID: {breakoutRoomId}</p>}
    </div>
  );
};

export default BreakoutRoom;
