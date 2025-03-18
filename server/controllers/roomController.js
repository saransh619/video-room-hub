const Room = require("../models/Room");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const createRoom = async (req, res) => {
  const { maxUsers, pricePerUser, creator } = req.body;

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

const joinRoom = async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;

  try {
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check if the room is full
    if (room.currentUsers >= room.maxUsers) {
      return res.status(400).json({ error: "Room is full" });
    }

    // Check if the user has paid (assuming payment status is stored in the User model)
    const user = await User.findById(userId);
    if (!user || user.paymentStatus !== "paid") {
      return res
        .status(400)
        .json({ error: "Payment required to join the room" });
    }

    // Add user to the room
    room.users.push(userId);
    room.currentUsers += 1;
    if (room.currentUsers >= room.maxUsers) {
      room.status = "full";
    }
    await room.save();

    res.status(200).json({ message: "Joined room successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
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

module.exports = {
  createRoom,
  joinRoom,
  getRoomUsers,
  generateRoomLink,
  closeRoom,
};
