const Room = require("../models/Room");
const User = require("../models/User");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const createRoom = async (req, res) => {
  const { maxUsers, pricePerUser } = req.body;
  const creator = req.user.userId;

  // Validate input
  if (!maxUsers || !pricePerUser || !creator) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const roomLink = uuidv4(); // Generate a unique room link
    const room = new Room({ maxUsers, pricePerUser, creator, roomLink });
    await room.save();
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

const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    console.log(`Join room attempt - User: ${userId}, Room: ${roomId}`);

    // Fetch room, payment, and user in parallel
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

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check room capacity
    if (room.currentUsers >= room.maxUsers) {
      return res.status(400).json({ error: "Room is full" });
    }

    // Verify payment
    if (!validPayment) {
      return res.status(400).json({
        error: "Valid payment required",
        details: "No active payment found for this room",
      });
    }

    // Check for duplicate join
    if (room.users.includes(userId)) {
      return res.status(200).json({
        message: "User already in room",
        warning: "Duplicate join attempt prevented",
        currentUsers: room.currentUsers,
      });
    }

    // Update room
    room.users.push(userId);
    room.currentUsers += 1;
    if (room.currentUsers >= room.maxUsers) room.status = "full";
    await room.save();

    // Update user
    await User.findByIdAndUpdate(userId, {
      currentRoom: roomId,
      status: "in-room",
      updatedAt: new Date(),
    });

    // Emit socket event
    req.io.to(roomId).emit("user-joined", {
      userId,
      username: user.username,
      currentUsers: room.currentUsers,
      roomStatus: room.status,
    });

    res.status(200).json({
      message: "Joined room successfully",
      roomStatus: room.status,
      currentUsers: room.currentUsers,
      isAdmin: room.creator.toString() === userId,
    });
  } catch (error) {
    console.error("Join room error:", error.message);
    res.status(400).json({
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
  const { roomId } = req.params;

  try {
    const room = await Room.findByIdAndUpdate(
      roomId,
      { status: "closed" },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.status(200).json({ message: "Room closed successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
  joinRoom,
  getRoomUsers,
  generateRoomLink,
  closeRoom,
  validateRoomLink,
};
