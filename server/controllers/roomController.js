const Room = require("../models/Room");
const User = require("../models/User");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const createRoom = async (req, res) => {
  const { maxUsers, pricePerUser } = req.body;
  const creator = req.user.userId;

  if (!maxUsers || !pricePerUser || !creator) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const room = new Room({ maxUsers, pricePerUser, creator });
    await room.save();

    const BASE_URL = process.env.CLIENT_URL || "http://localhost:5173";
    const roomLink = `${BASE_URL}/join-room?roomId=${room._id}`;

    await Room.findByIdAndUpdate(room._id, { roomLink });

    res.status(201).json({ roomId: room._id, roomLink });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getRoomDetails = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate(
      "creator",
      "username"
    );

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({
      id: room._id,
      maxUsers: room.maxUsers,
      pricePerUser: room.pricePerUser,
      currentUsers: room.users.length,
      creator: room.creator,
      status: room.status,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const checkStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    // Fetch room and payment data
    const [room, validPayment, user] = await Promise.all([
      Room.findById(roomId),
      Payment.findOne({
        userId,
        roomId,
        status: "paid",
        expiresAt: { $gt: new Date() },
      }),
      User.findById(userId),
    ]);

    // Validate room
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status === "closed")
      return res.status(400).json({ error: "Room is closed" });
    if (room.currentUsers >= room.maxUsers)
      return res.status(400).json({ error: "Room is full" });

    // Check if user is the creator
    const isCreator = room.creator.toString() === userId;

    // Check if user is already in the room
    if (room.users.some((u) => u.toString() === userId)) {
      return res.status(200).json({
        message: "Can join room",
        currentUsers: room.currentUsers,
      });
    }

    // If user is the creator, they can join without payment
    if (isCreator) {
      return res.status(200).json({
        message: "Can join room",
        currentUsers: room.currentUsers,
      });
    }

    // For non-creators, check payment
    if (!validPayment) {
      return res.status(402).json({
        error: "Payment required",
        details: "No valid payment found",
      });
    }

    // If payment exists, user can join
    return res.status(200).json({
      message: "Can join room",
      currentUsers: room.currentUsers,
    });
  } catch (error) {
    console.error("Check status error:", error);
    res.status(500).json({
      error: "Failed to check status",
      details: error.message,
    });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    // Fetch all required data
    const [room, validPayment, user] = await Promise.all([
      Room.findById(roomId),
      Payment.findOne({
        userId,
        roomId,
        status: "paid",
        expiresAt: { $gt: new Date() },
      }),
      User.findById(userId),
    ]);

    // Validate room
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.status === "closed")
      return res.status(400).json({ error: "Room is closed" });
    if (room.currentUsers >= room.maxUsers)
      return res.status(400).json({ error: "Room is full" });

    // Check if user is the creator
    const isCreator = room.creator.toString() === userId;

    // Check if user is already in the room
    if (room.users.some((u) => u.toString() === userId)) {
      // If the user is the creator, they should always be allowed to join without payment
      if (isCreator) {
        return res.status(200).json({
          message: "User already in room",
          currentUsers: room.currentUsers,
          isAdmin: true,
        });
      }

      // For non-creators, check payment
      if (!validPayment) {
        return res.status(402).json({
          error: "Payment required",
          details: "No valid payment found",
        });
      }

      return res.status(200).json({
        message: "User already in room",
        currentUsers: room.currentUsers,
      });
    }

    // Remove user from previous room if they are in one
    if (user.currentRoom && user.currentRoom.toString() !== roomId) {
      const previousRoom = await Room.findById(user.currentRoom);
      if (previousRoom) {
        await Room.findByIdAndUpdate(user.currentRoom, {
          $pull: { users: userId },
          $inc: { currentUsers: -1 },
          $set: {
            status:
              previousRoom.currentUsers - 1 < previousRoom.maxUsers
                ? "open"
                : previousRoom.status,
            isVideoActive: previousRoom.currentUsers - 1 > 0, // Update isVideoActive
          },
        });
        // Notify previous room
        req.io.to(user.currentRoom.toString()).emit("user-left-room", {
          userId,
          username: user.username,
          currentUsers: previousRoom.currentUsers - 1,
          roomStatus:
            previousRoom.currentUsers - 1 < previousRoom.maxUsers
              ? "open"
              : "full",
        });
      }
    }

    // Payment validation (only for non-creators)
    if (!isCreator && !validPayment) {
      return res.status(402).json({
        error: "Payment required",
        details: "No valid payment found",
      });
    }

    // Prevent duplicate joins
    const updatedRoom = await Room.findOneAndUpdate(
      {
        _id: roomId,
        users: { $ne: userId },
      },
      {
        $addToSet: { users: userId },
        $inc: { currentUsers: 1 },
        $set: {
          status: room.currentUsers + 1 >= room.maxUsers ? "full" : room.status,
          isVideoActive: true, // Set to true when a user joins
        },
      },
      { new: true }
    );

    // If no update occurred (user was already in room), return early
    if (!updatedRoom) {
      const existingRoom = await Room.findById(roomId);
      return res.status(200).json({
        message: "User already in room",
        currentUsers: existingRoom.currentUsers,
      });
    }

    // Update user
    await User.findByIdAndUpdate(userId, {
      currentRoom: roomId,
      status: "in-room",
      updatedAt: new Date(),
    });

    // Emit real-time event
    req.io.to(roomId).emit("user-joined", {
      userId,
      username: user.username,
      currentUsers: updatedRoom.currentUsers,
      roomStatus: updatedRoom.status,
    });

    res.status(200).json({
      message: "Joined room successfully",
      roomStatus: updatedRoom.status,
      currentUsers: updatedRoom.currentUsers,
      isAdmin: isCreator,
    });
  } catch (error) {
    console.error("Join room error:", error);
    res.status(500).json({
      error: "Failed to join room",
      details: error.message,
    });
  }
};

const getRoomUsers = async (req, res) => {
  const { roomId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return res.status(400).json({ error: "Invalid Room ID" });
  }

  try {
    const room = await Room.findById(roomId).populate("users");
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.status(200).json({ users: room.users });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const generateRoomLink = async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.status(200).json({ roomLink: room.roomLink });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const closeRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) return res.status(404).json({ error: "Room not found" });

    // Update all users in the room
    await User.updateMany(
      { _id: { $in: room.users } },
      {
        currentRoom: null,
        status: "inactive",
      }
    );

    // Close the room
    await Room.findByIdAndUpdate(roomId, {
      status: "closed",
      closedAt: new Date(),
      users: [],
      currentUsers: 0,
      isVideoActive: false, // Set isVideoActive to false since the room is closed
    });

    // Notify all users
    req.io.to(roomId).emit("room-closed", {
      message: "Admin closed the room",
      closedBy: req.user.userId,
    });

    res.status(200).json({
      message: "Room closed successfully",
      affectedUsers: room.users.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to close room",
      details: error.message,
    });
  }
};

const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    console.log(`User ${userId} is leaving room ${roomId}`);

    const [room, user] = await Promise.all([
      Room.findById(roomId),
      User.findById(userId),
    ]);

    if (!room || !user) {
      console.error(`Room or user not found: room=${!!room}, user=${!!user}`);
      return res.status(404).json({
        error: room ? "User not found" : "Room not found",
      });
    }

    // Remove user from room
    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      {
        $pull: { users: userId },
        $inc: { currentUsers: -1 },
        $set: {
          status:
            room.status === "full" && room.currentUsers - 1 < room.maxUsers
              ? "open"
              : room.status,
          isVideoActive: room.currentUsers - 1 > 0, // Set isVideoActive based on remaining users
        },
      },
      { new: true }
    );

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        currentRoom: null,
        status: "inactive",
      },
      { new: true }
    );

    // Emit socket events
    req.io.to(roomId).emit("user-left", {
      userId,
      username: user.username,
      currentUsers: updatedRoom.currentUsers,
      roomStatus: updatedRoom.status,
    });

    res.status(200).json({
      message: "Left room successfully",
      currentUsers: updatedRoom.currentUsers,
    });
  } catch (error) {
    console.error("Error in leaveRoom:", error);
    res.status(400).json({
      error: "Failed to leave room",
      details: error.message,
    });
  }
};

const removeUserFromRoom = async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    const [room, user] = await Promise.all([
      Room.findById(roomId),
      User.findById(userId),
    ]);

    if (!room || !user) {
      return res.status(404).json({
        error: room ? "User not found" : "Room not found",
      });
    }

    // Remove user from room
    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      {
        $pull: { users: userId },
        $inc: { currentUsers: -1 },
        $set: {
          status:
            room.status === "full" && room.currentUsers - 1 < room.maxUsers
              ? "open"
              : room.status,
          isVideoActive: room.currentUsers - 1 > 0, // Set isVideoActive based on remaining users
        },
      },
      { new: true }
    );

    // Update user
    await User.findByIdAndUpdate(userId, {
      currentRoom: null,
      status: "inactive",
    });

    // Emit socket events
    req.io.to(roomId).emit("user-removed", {
      userId,
      username: user.username,
      byAdmin: req.user.userId,
      currentUsers: updatedRoom.currentUsers,
      roomId,
    });

    res.status(200).json({
      message: "User removed from room",
      currentUsers: updatedRoom.currentUsers,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to remove user from room",
      details: error.message,
    });
  }
};

const validateRoomLink = async (req, res) => {
  const { roomLink } = req.params;
  try {
    const room = await Room.findOne({ roomLink });
    if (!room) {
      return res.status(404).json({ valid: false, error: "Room not found" });
    }
    res.status(200).json({
      valid: true,
      roomId: room._id,
      maxUsers: room.maxUsers,
      currentUsers: room.currentUsers,
      pricePerUser: room.pricePerUser,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createRoom,
  getRoomDetails,
  checkStatus,
  joinRoom,
  getRoomUsers,
  generateRoomLink,
  closeRoom,
  leaveRoom,
  removeUserFromRoom,
  validateRoomLink,
};
