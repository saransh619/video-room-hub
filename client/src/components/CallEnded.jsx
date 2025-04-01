import React from "react";
import { Link } from "react-router-dom";

const CallEnded = () => {
  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Call Ended</h1>
      <p>The video call has ended.</p>
      <p>
        Return to <Link to="/join-room">Join Room</Link> or{" "}
        <Link to="/create-room">Create a New Room</Link>.
      </p>
    </div>
  );
};

export default CallEnded;
