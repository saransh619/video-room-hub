import React, { useState } from "react";
import axios from "axios";
import BASE_URL from "../utils/config";

const Poll = () => {
  const [pollId, setPollId] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);

  const handleCreatePoll = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/api/polls/create`, {
        question: "What is your favorite color?",
        options: ["Red", "Blue", "Green", "Yellow"],
        breakoutRoomId: "breakout-room-id", // Replace with actual breakout room ID
      });
      setPollId(response.data.pollId);
      alert(`Poll created with ID: ${response.data.pollId}`);
    } catch (error) {
      console.error("Error creating poll:", error);
    }
  };

  const handleCastVote = async () => {
    if (selectedOption === null) {
      alert("Please select an option");
      return;
    }
    try {
      await axios.post(`${BASE_URL}/api/polls/cast-vote`, {
        pollId,
        optionIndex: selectedOption,
      });
      alert("Vote cast successfully");
    } catch (error) {
      console.error("Error casting vote:", error);
    }
  };

  return (
    <div className="poll">
      <h1>Poll</h1>
      <button onClick={handleCreatePoll}>Create Poll</button>
      {pollId && (
        <div>
          <p>Poll ID: {pollId}</p>
          <select onChange={(e) => setSelectedOption(Number(e.target.value))}>
            <option value={0}>Red</option>
            <option value={1}>Blue</option>
            <option value={2}>Green</option>
            <option value={3}>Yellow</option>
          </select>
          <button onClick={handleCastVote}>Cast Vote</button>
        </div>
      )}
    </div>
  );
};

export default Poll;
