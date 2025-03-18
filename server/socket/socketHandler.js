const Poll = require("../models/Poll");

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

    // Room events
    socket.on("user-join-room", handleUserJoinRoom(socket, io));
    socket.on("user-leave-room", handleUserLeaveRoom(socket, io));

    // Breakout room events
    socket.on("user-enter-breakout", handleUserEnterBreakout(socket, io));
    socket.on("user-exit-breakout", handleUserExitBreakout(socket, io));

    // Poll/voting events
    socket.on("user-vote", handleUserVote(socket, io));

    // Video call events
    socket.on("toggle-audio", handleToggleAudio(socket, io));
    socket.on("toggle-video", handleToggleVideo(socket, io));
    socket.on("admin-mute-all", handleAdminMuteAll(socket, io));
    socket.on("admin-end-call", handleAdminEndCall(socket, io));

    // WebRTC Signaling Events
    socket.on("offer", handleWebRTCOffer(socket, io));
    socket.on("answer", handleWebRTCAnswer(socket, io));
    socket.on("ice-candidate", handleWebRTCIceCandidate(socket, io));

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
      handleUserDisconnect(socket, io);
    });
  });
};

// Room event handlers
const handleUserJoinRoom = (socket, io) => async (data) => {
  const { userId, roomId, username } = data;

  socket.join(roomId);
  io.to(roomId).emit("user-joined-room", { userId, roomId, username });

  console.log(`User ${userId} joined room ${roomId}`);
};

const handleUserLeaveRoom = (socket, io) => async (data) => {
  const { userId, roomId } = data;

  socket.leave(roomId);
  io.to(roomId).emit("user-left-room", { userId, roomId });

  console.log(`User ${userId} left room ${roomId}`);
};

// Breakout room event handlers
const handleUserEnterBreakout = (socket, io) => async (data) => {
  const { userId, breakoutRoomId, mainRoomId } = data;

  socket.join(breakoutRoomId);
  io.to(mainRoomId).emit("user-entered-breakout", { userId, breakoutRoomId });
  io.to(breakoutRoomId).emit("user-joined-breakout", { userId });

  console.log(`User ${userId} entered breakout room ${breakoutRoomId}`);
};

const handleUserExitBreakout = (socket, io) => async (data) => {
  const { userId, breakoutRoomId, mainRoomId } = data;

  socket.leave(breakoutRoomId);
  io.to(mainRoomId).emit("user-exited-breakout", { userId, breakoutRoomId });
  io.to(breakoutRoomId).emit("user-left-breakout", { userId });

  console.log(`User ${userId} exited breakout room ${breakoutRoomId}`);
};

// Poll/voting event handlers
const handleUserVote = (socket, io) => async (data) => {
  const { userId, pollId, optionIndex, roomId } = data;

  try {
    const poll = await Poll.findById(pollId);
    if (!poll) return socket.emit("vote-error", { message: "Poll not found" });

    poll.votes[optionIndex] += 1;
    await poll.save();

    const updatedResults = {
      question: poll.question,
      options: poll.options,
      votes: poll.votes,
    };

    io.to(roomId).emit("poll-results-updated", updatedResults);
    console.log(
      `User ${userId} voted for option ${optionIndex} in poll ${pollId}`
    );
  } catch (error) {
    socket.emit("vote-error", { message: "Failed to process vote" });
  }
};

// Video call event handlers
const handleToggleAudio = (socket, io) => (data) => {
  const { userId, roomId, isAudioEnabled } = data;
  io.to(roomId).emit("user-audio-change", { userId, isAudioEnabled });
};

const handleToggleVideo = (socket, io) => (data) => {
  const { userId, roomId, isVideoEnabled } = data;
  io.to(roomId).emit("user-video-change", { userId, isVideoEnabled });
};

const handleAdminMuteAll = (socket, io) => (data) => {
  const { roomId, adminId } = data;
  io.to(roomId).emit("admin-muted-all", { adminId });
};

const handleAdminEndCall = (socket, io) => (data) => {
  const { roomId, adminId } = data;
  io.to(roomId).emit("call-ended", { adminId });
};

// WebRTC Signaling Events
const handleWebRTCOffer = (socket, io) => (data) => {
  const { roomId, offer, senderId } = data;
  socket.to(roomId).emit("offer-received", { offer, senderId });
};

const handleWebRTCAnswer = (socket, io) => (data) => {
  const { roomId, answer, senderId } = data;
  socket.to(roomId).emit("answer-received", { answer, senderId });
};

const handleWebRTCIceCandidate = (socket, io) => (data) => {
  const { roomId, candidate, senderId } = data;
  socket.to(roomId).emit("ice-candidate-received", { candidate, senderId });
};

// Disconnect handler
const handleUserDisconnect = (socket, io) => {
  console.log("Client disconnected");
};

module.exports = socketHandler;
