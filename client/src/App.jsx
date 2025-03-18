import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import RoomCreation from "./components/RoomCreation";
import RoomJoining from "./components/RoomJoining";
import VideoCall from "./components/VideoCall";
import BreakoutRoom from "./components/BreakoutRoom";
import Poll from "./components/Poll";
import Home from "./components/Home";
import "./App.css";
import Payment from "./components/Payment";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/create-room" element={<RoomCreation />} />
        <Route path="/join-room" element={<RoomJoining />} />
        <Route path="/video-call" element={<VideoCall />} />
        <Route path="/breakout-room" element={<BreakoutRoom />} />
        <Route path="/poll" element={<Poll />} />
        <Route path="/payment" element={<Payment />} />
      </Routes>
    </Router>
  );
}

export default App;
