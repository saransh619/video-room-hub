const Poll = require("../models/Poll");
const User = require("../models/User");
const Room = require("../models/Room");

const socketHandler = (io) => {
  // Store connected users for each room
  const roomUsers = new Map();
  const roomMuteState = new Map(); // Store mute state for each room

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);
    socket.userId = socket.handshake.auth.userId;
    console.log("userId:", socket.userId);

    if (!socket.userId) {
      console.error("No userId provided in socket handshake");
      return;
    }

    // Room events
    socket.on(
      "user-joined",
      handleUserJoined(socket, io, roomUsers, roomMuteState)
    );
    socket.on("user-left", handleUserLeft(socket, io, roomUsers));
    socket.on("get-room-users", handleGetRoomUsers(socket, io, roomUsers));
    socket.on("room-closed", handleRoomClosed(socket, io));
    socket.on("user-removed", handleUserRemoved(socket, io));

    // Breakout room events
    socket.on("user-enter-breakout", handleUserEnterBreakout(socket, io));
    socket.on("user-exit-breakout", handleUserExitBreakout(socket, io));

    // Poll/voting events
    socket.on("user-vote", handleUserVote(socket, io));

    // Video call events
    socket.on("toggle-audio", handleToggleAudio(socket, io, roomMuteState));
    socket.on("toggle-video", handleToggleVideo(socket, io));
    socket.on(
      "admin-mute-all",
      handleAdminMuteAll(socket, io, roomMuteState, roomUsers)
    );
    socket.on(
      "admin-unmute-all",
      handleAdminUnmuteAll(socket, io, roomMuteState)
    );
    socket.on("admin-end-call", handleAdminEndCall(socket, io));

    // WebRTC Signaling Events
    socket.on("offer", handleOffer(socket, io, roomUsers));
    socket.on("answer", handleAnswer(socket, io));
    socket.on("ice-candidate", handleIceCandidate(socket, io));

    // Handle disconnection
    socket.on("disconnect", handleUserDisconnect(socket, io, roomUsers));
  });
};

// Room event handlers
const handleUserJoined = (socket, io, roomUsers, roomMuteState) => (data) => {
  const { userId, roomId, username, socketId } = data;

  if (!roomId || !userId || !socketId) {
    console.error("Invalid user-joined data:", data);
    return;
  }

  socket.join(roomId);
  console.log(`Socket ${socket.id} joined room ${roomId}`);

  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map());
  }
  const room = roomUsers.get(roomId);
  room.set(userId, { socketId, username });

  // Check mute state and enforce if active
  const roomState = roomMuteState.get(roomId) || {
    isMuted: false,
    adminId: null,
  };
  if (roomState.isMuted && userId !== roomState.adminId) {
    socket.emit("force-mute", { adminId: roomState.adminId });
    socket.emit("admin-mute-all", {
      adminId: roomState.adminId,
      adminName: "Admin",
      message: "You have been muted by the admin",
      persistent: true,
    });
  }

  socket.to(roomId).emit("user-joined-room", {
    userId,
    username,
    socketId,
  });
  console.log(`User ${userId} (${username}) joined room ${roomId}`);
};

const handleUserLeft = (socket, io, roomUsers) => (data) => {
  const { userId, roomId, username, currentUsers, roomStatus } = data;

  if (!roomId || !userId) {
    console.error("Invalid user-left data:", data);
    return;
  }

  socket.leave(roomId);
  console.log(`Socket ${socket.id} left room ${roomId}`);

  // Remove user from roomUsers
  if (roomUsers.has(roomId)) {
    roomUsers.get(roomId).delete(userId);
    if (roomUsers.get(roomId).size === 0) {
      roomUsers.delete(roomId);
    }
  }
  console.log(
    ` roomUsers updated for room ${roomId}:`,
    roomUsers.has(roomId)
      ? Array.from(roomUsers.get(roomId).entries())
      : "Room deleted"
  );

  io.to(roomId).emit("user-left-room", {
    userId,
    username,
    currentUsers,
    roomStatus,
  });
  console.log(`User ${userId} left room ${roomId}`);
};

const handleGetRoomUsers = (socket, io, roomUsers) => (data) => {
  const { roomId } = data;

  if (!roomId) {
    console.error("Invalid get-room-users data:", data);
    return;
  }

  const users = roomUsers.has(roomId)
    ? Array.from(roomUsers.get(roomId).entries()).map(([userId, info]) => ({
        userId,
        username: info.username,
        socketId: info.socketId,
      }))
    : [];

  socket.emit("room-users", { users });
  console.log(
    ` Sent room users to socket ${socket.id} for room ${roomId}:`,
    users
  );
};

const handleRoomClosed = (socket, io) => (data) => {
  const { roomId, closedBy } = data;

  if (!roomId || !closedBy) {
    console.error("Invalid room-closed data:", data);
    return;
  }

  io.to(roomId).emit("room-closed-notification", {
    message: "Room closed by admin",
    closedBy,
    closedAt: new Date(),
  });

  io.in(roomId).socketsLeave(roomId);
  console.log(`Room ${roomId} closed by ${closedBy}`);
};

const handleUserRemoved = (socket, io) => (data) => {
  const { userId, roomId, username, byAdmin, currentUsers } = data;

  if (!roomId || !userId || !byAdmin) {
    console.error("Invalid user-removed data:", data);
    return;
  }

  io.to(roomId).emit("user-removed-from-room", {
    userId,
    username,
    byAdmin,
    currentUsers,
  });

  io.to(userId).emit("you-were-removed", {
    roomId,
    byAdmin,
    username,
    timestamp: new Date(),
  });

  console.log(`User ${userId} removed from room ${roomId} by admin ${byAdmin}`);
};

// Breakout room event handlers
const handleUserEnterBreakout = (socket, io) => async (data) => {
  const { userId, breakoutRoomId, mainRoomId } = data;

  if (!userId || !breakoutRoomId || !mainRoomId) {
    console.error("Invalid user-enter-breakout data:", data);
    return;
  }

  socket.join(breakoutRoomId);
  io.to(mainRoomId).emit("user-entered-breakout", { userId, breakoutRoomId });
  io.to(breakoutRoomId).emit("user-joined-breakout", { userId });

  console.log(`User ${userId} entered breakout room ${breakoutRoomId}`);
};

const handleUserExitBreakout = (socket, io) => async (data) => {
  const { userId, breakoutRoomId, mainRoomId } = data;

  if (!userId || !breakoutRoomId || !mainRoomId) {
    console.error("Invalid user-exit-breakout data:", data);
    return;
  }

  socket.leave(breakoutRoomId);
  io.to(mainRoomId).emit("user-exited-breakout", { userId, breakoutRoomId });
  io.to(breakoutRoomId).emit("user-left-breakout", { userId });

  console.log(`User ${userId} exited breakout room ${breakoutRoomId}`);
};

// Poll/voting event handlers
const handleUserVote = (socket, io) => async (data) => {
  const { userId, pollId, optionIndex, roomId } = data;

  if (!userId || !pollId || optionIndex === undefined || !roomId) {
    console.error("Invalid user-vote data:", data);
    socket.emit("vote-error", { message: "Invalid vote data" });
    return;
  }

  try {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      socket.emit("vote-error", { message: "Poll not found" });
      return;
    }

    poll.votes[optionIndex] = (poll.votes[optionIndex] || 0) + 1;
    await poll.save();

    const updatedResults = {
      question: poll.question,
      options: poll.options,
      votes: poll.votes,
    };

    io.to(roomId).emit("poll-results-updated", updatedResults);
    console.log(
      `  User ${userId} voted for option ${optionIndex} in poll ${pollId} in room ${roomId}`
    );
  } catch (error) {
    console.error("Vote processing error:", error);
    socket.emit("vote-error", { message: "Failed to process vote" });
  }
};

// Video call event handlers
const handleToggleAudio = (socket, io, roomMuteState) => (data) => {
  const { userId, roomId, isAudioEnabled } = data;

  if (!userId || !roomId || isAudioEnabled === undefined) {
    console.error("Invalid toggle-audio data:", data);
    return;
  }

  const roomState = roomMuteState.get(roomId) || {
    isMuted: false,
    adminId: null,
  };
  if (roomState.isMuted && userId !== roomState.adminId && isAudioEnabled) {
    socket.emit("mute-enforced", {
      message: "Admin has muted all participants. You cannot unmute.",
    });
    socket.emit("force-mute", { adminId: roomState.adminId });
    console.log(
      `Blocked audio enable attempt by ${userId} in muted room ${roomId}`
    );
    return;
  }
};

const handleToggleVideo = (socket, io) => (data) => {
  const { userId, roomId, isVideoEnabled } = data;

  if (!userId || !roomId || isVideoEnabled === undefined) {
    console.error("Invalid toggle-video data:", data);
    return;
  }

  io.to(roomId).emit("user-video-change", { userId, isVideoEnabled });
  console.log(
    ` User ${userId} toggled video to ${isVideoEnabled} in room ${roomId}`
  );
};

const handleAdminMuteAll =
  (socket, io, roomMuteState, roomUsers) => async (data) => {
    const { roomId, adminId, adminName } = data;
    if (!roomId || !adminId) return;

    // Check the number of participants in the room (excluding the admin)
    const roomParticipants = roomUsers.get(roomId) || new Map();
    const participantCount = Array.from(roomParticipants.keys()).filter(
      (userId) => userId !== adminId
    ).length;

    if (participantCount === 0) {
      // No participants to mute
      socket.emit("admin-mute-all", {
        adminId,
        adminName,
        message: "No participants have joined the room yet to mute.",
        persistent: true,
        noParticipants: true, // Flag to indicate no participants
      });
      console.log(
        `Admin ${adminId} tried to mute all in room ${roomId}, but no participants are present`
      );
      return;
    }

    // Proceed with muting if there are participants
    roomMuteState.set(roomId, { isMuted: true, adminId });

    socket.emit("admin-mute-all", {
      adminId,
      adminName,
      message: "You have muted all participants",
      persistent: true,
      noParticipants: false,
    });

    io.to(roomId)
      .except(socket.id)
      .emit("admin-mute-all", {
        adminId,
        adminName,
        message: `${adminName} has muted all participants`,
        persistent: true,
        noParticipants: false,
      });

    try {
      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach((s) => {
        if (s.userId !== adminId) {
          s.emit("force-mute", { adminId });
        }
      });

      const interval = setInterval(async () => {
        if (!roomMuteState.get(roomId)?.isMuted) {
          clearInterval(interval);
          return;
        }
        const currentSockets = await io.in(roomId).fetchSockets();
        currentSockets.forEach((s) => {
          if (s.userId !== adminId) {
            s.emit("force-mute", { adminId });
          }
        });
      }, 500);

      console.log(`Admin ${adminId} muted all in room ${roomId}`);
    } catch (error) {
      console.error("Error muting participants:", error);
    }
  };

const handleAdminUnmuteAll = (socket, io, roomMuteState) => (data) => {
  const { roomId, adminId, adminName } = data;
  if (!roomId || !adminId) return;

  roomMuteState.set(roomId, { isMuted: false, adminId });

  socket.emit("admin-unmute-all", {
    adminId,
    adminName,
    message: "You have unmuted all participants",
    persistent: false,
  });

  io.to(roomId)
    .except(socket.id)
    .emit("admin-unmute-all", {
      adminId,
      adminName,
      message: `${adminName} has unmuted all participants`,
      persistent: false,
    });

  console.log(`Admin ${adminId} unmuted all in room ${roomId}`);
};

const handleAdminEndCall = (socket, io) => (data) => {
  const { roomId, adminId } = data;

  if (!roomId || !adminId) {
    console.error("Invalid admin-end-call data:", data);
    return;
  }

  io.to(roomId).emit("call-ended", { adminId });
  console.log(`Admin ${adminId} ended call in room ${roomId}`);
};

// WebRTC Signaling Event Handlers
const handleOffer = (socket, io, roomUsers) => (data) => {
  const { roomId, offer, senderId, targetUserId, to } = data;

  console.log(
    `Received offer from ${senderId} for ${targetUserId} (socket: ${to})`
  );
  if (!roomId || !offer || !senderId || !targetUserId || !to) {
    console.error("Invalid offer data:", data);
    return;
  }
  io.to(to).emit("offer-received", { offer, senderId, from: socket.id });
  console.log(`Sent offer to ${targetUserId} (socket: ${to})`);
};

const handleAnswer = (socket, io) => (data) => {
  const { roomId, answer, senderId, targetUserId, to } = data;

  console.log(
    ` Received answer from ${senderId} for ${targetUserId} (socket: ${to})`
  );
  if (!roomId || !answer || !senderId || !targetUserId || !to) {
    console.error("Invalid answer data:", data);
    return;
  }
  io.to(to).emit("answer-received", { answer, senderId, from: socket.id });
  console.log(`Sent answer to ${targetUserId} (socket: ${to})`);
};

const handleIceCandidate = (socket, io) => (data) => {
  const { roomId, candidate, senderId, targetUserId, to } = data;

  console.log(
    ` Received ICE candidate from ${senderId} for ${targetUserId} (socket: ${to})`
  );
  if (!roomId || !candidate || !senderId || !targetUserId || !to) {
    console.error("Invalid ICE candidate data:", data);
    return;
  }
  io.to(to).emit("ice-candidate-received", {
    candidate,
    senderId,
    from: socket.id,
  });
  console.log(`Sent ICE candidate to ${targetUserId} (socket: ${to})`);
};

// Disconnect handler
const handleUserDisconnect =
  (socket, io, roomUsers, roomMuteState) => async () => {
    console.log(`Socket ${socket.id} disconnected`);
    const userId = socket.userId;
    if (!userId) {
      console.error("No userId found on disconnect");
      return;
    }

    try {
      // Find the room the user was in
      const user = await User.findById(userId);
      if (!user || !user.currentRoom) {
        console.log(`User ${userId} disconnected, no room to clean up`);
        return;
      }

      const roomId = user.currentRoom.toString();
      const room = await Room.findById(roomId);
      if (!room) {
        console.log(
          `Room ${roomId} not found for user ${userId} on disconnect`
        );
        return;
      }

      // Remove user from roomUsers
      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(userId);
        if (roomUsers.get(roomId).size === 0) {
          roomUsers.delete(roomId);
          roomMuteState.delete(roomId); // Clean up mute state when room is empty
        }
      }
      console.log(
        `roomUsers updated for room ${roomId}:`,
        roomUsers.has(roomId)
          ? Array.from(roomUsers.get(roomId).entries())
          : "Room deleted"
      );

      // Update the Room and User in the database
      const updatedRoom = await Room.findByIdAndUpdate(
        roomId,
        {
          $pull: { users: userId },
          $inc: { currentUsers: -1 },
          $set: {
            status:
              room.currentUsers - 1 < room.maxUsers ? "open" : room.status,
          },
        },
        { new: true }
      );

      user.currentRoom = null;
      user.status = "inactive";
      await user.save();

      // Notify other users in the room
      io.to(roomId).emit("user-disconnected", {
        userId,
        username: user.username,
        currentUsers: updatedRoom.currentUsers,
        roomStatus:
          updatedRoom.currentUsers < updatedRoom.maxUsers ? "open" : "full",
      });

      console.log(`User ${userId} disconnected from room ${roomId}`);
    } catch (error) {
      console.error("Disconnect cleanup error:", error);
    }
  };

module.exports = socketHandler;
