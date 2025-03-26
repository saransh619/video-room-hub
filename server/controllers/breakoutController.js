const BreakoutRoom = require("../models/BreakoutRoom");
const User = require("../models/User");
const Room = require("../models/Room");

exports.createBreakoutRoom = async (req, res) => {
  const { roomId, users, quizQuestions } = req.body;

  // Validate input
  if (!roomId || !users || !quizQuestions || quizQuestions.length !== 5) {
    return res.status(400).json({
      error:
        "Missing required fields or incorrect number of quiz questions. 5 questions are required.",
    });
  }

  try {
    // Check if the main room exists
    const mainRoom = await Room.findById(roomId);
    if (!mainRoom) {
      return res.status(404).json({ error: "Main room not found" });
    }

    // Check if all users are in the main room
    const usersInRoom = mainRoom.users.map((user) => user.toString());
    const invalidUsers = users.filter(
      (userId) => !usersInRoom.includes(userId)
    );

    if (invalidUsers.length > 0) {
      return res.status(400).json({
        error: "Some users are not in the main room",
        invalidUsers,
      });
    }

    // Create the breakout room
    const breakoutRoom = new BreakoutRoom({ roomId, users, quizQuestions });
    await breakoutRoom.save();

    // Update user statuses
    await User.updateMany({ _id: { $in: users } }, { status: "in-breakout" });

    // Notify clients via Socket.IO
    req.io.to(roomId).emit("breakout-room-created", {
      breakoutRoomId: breakoutRoom._id,
      users,
    });

    res.status(201).json({
      breakoutRoomId: breakoutRoom._id,
      message: "Breakout room created successfully",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.startBreakoutTimer = async (req, res) => {
  const { breakoutRoomId } = req.params;

  try {
    const breakoutRoom = await BreakoutRoom.findById(breakoutRoomId);
    if (!breakoutRoom) {
      return res.status(404).json({ error: "Breakout room not found" });
    }

    // Don't allow restarting if already active or completed
    if (breakoutRoom.status !== "pending") {
      return res.status(400).json({
        error: "Breakout room timer can only be started from pending status",
      });
    }

    // Update startedAt and status
    breakoutRoom.startedAt = new Date();
    breakoutRoom.status = "active";
    await breakoutRoom.save();

    // Set timeout to automatically end after 2 minutes
    setTimeout(async () => {
      try {
        const updatedRoom = await BreakoutRoom.findById(breakoutRoomId);
        if (updatedRoom && updatedRoom.status === "active") {
          updatedRoom.status = "completed";
          updatedRoom.endedAt = new Date();
          await updatedRoom.save();

          // Update all users' status back to "in-room"
          await User.updateMany(
            { _id: { $in: updatedRoom.users } },
            { status: "in-room" }
          );

          // Notify users to return to main room
          req.io.to(breakoutRoomId).emit("breakout-time-expired", {
            breakoutRoomId,
            mainRoomId: updatedRoom.roomId,
          });
        }
      } catch (error) {
        console.error("Error in breakout timer expiration:", error);
      }
    }, 120000); // 2 minutes

    res.status(200).json({
      message: "Breakout timer started",
      expiresAt: new Date(Date.now() + 120000),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.joinBreakoutRoom = async (req, res) => {
  const { breakoutRoomId } = req.params;
  const { userId } = req.body;

  try {
    const breakoutRoom = await BreakoutRoom.findById(breakoutRoomId);
    if (!breakoutRoom) {
      return res.status(404).json({ error: "Breakout room not found" });
    }

    // Check if user is allowed in this breakout room
    if (!breakoutRoom.users.includes(userId)) {
      return res
        .status(403)
        .json({ error: "User not assigned to this breakout room" });
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      userId,
      { status: "in-breakout" },
      { new: true }
    );

    // Notify clients via Socket.IO
    req.io.to(breakoutRoomId).emit("user-joined-breakout", { userId });

    res.status(200).json({ message: "Joined breakout room successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.leaveBreakoutRoom = async (req, res) => {
  const { breakoutRoomId } = req.params;
  const { userId } = req.body;

  try {
    const breakoutRoom = await BreakoutRoom.findById(breakoutRoomId);
    if (!breakoutRoom) {
      return res.status(404).json({ error: "Breakout room not found" });
    }

    // Update user status back to "in-room"
    const user = await User.findByIdAndUpdate(
      userId,
      { status: "in-room" },
      { new: true }
    );

    // Notify clients via Socket.IO
    req.io.to(breakoutRoom.roomId).emit("user-exited-breakout", {
      userId,
      breakoutRoomId,
    });

    res.status(200).json({ message: "Left breakout room successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getBreakoutQuestions = async (req, res) => {
  const { breakoutRoomId } = req.params;

  try {
    const breakoutRoom = await BreakoutRoom.findById(breakoutRoomId);
    if (!breakoutRoom) {
      return res.status(404).json({ error: "Breakout room not found" });
    }

    res.status(200).json({ questions: breakoutRoom.quizQuestions });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.endBreakoutRoom = async (req, res) => {
  const { breakoutRoomId } = req.params;

  try {
    const breakoutRoom = await BreakoutRoom.findById(breakoutRoomId);
    if (!breakoutRoom) {
      return res.status(404).json({ error: "Breakout room not found" });
    }

    // Update all users' status back to "in-room"
    await User.updateMany(
      { _id: { $in: breakoutRoom.users } },
      { status: "in-room" }
    );

    // Notify clients via Socket.IO
    req.io.to(breakoutRoom.roomId).emit("breakout-room-ended", {
      breakoutRoomId,
    });

    res.status(200).json({ message: "Breakout room ended successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.checkUserBreakoutStatus = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ breakoutRoomId: user.currentBreakoutRoom || null });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
