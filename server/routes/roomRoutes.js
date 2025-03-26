const express = require("express");
const roomController = require("../controllers/roomController");
const { authUser, authAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create a room
router.post("/create", authUser, roomController.createRoom);

// Get room details
router.get("/:roomId", authUser, roomController.getRoomDetails);

// Join a room
router.post("/:roomId/join", authUser, roomController.joinRoom);

// Fetch users for a room
router.get("/:roomId/users", authUser, roomController.getRoomUsers);

// Generate room link
router.get("/:roomId/link", authUser, roomController.generateRoomLink);

// Admin can close a room
router.post("/close/:roomId", authAdmin, roomController.closeRoom);

// Validate room link
router.get(
  "/validate-link/:roomLink",
  authUser,
  roomController.validateRoomLink
);

module.exports = router;
