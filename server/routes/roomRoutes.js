const express = require("express");
const roomController = require("../controllers/roomController");
const { authUser, authAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create a room
router.post("/create", authUser, roomController.createRoom);

// Get room details
router.get("/:roomId", authUser, roomController.getRoomDetails);

// Check user status for a room
router.get("/:roomId/check-status", authUser, roomController.checkStatus);

// Join a room
router.post("/:roomId/join", authUser, roomController.joinRoom);

// Fetch users for a room
router.get("/:roomId/users", authUser, roomController.getRoomUsers);

// Generate room link
router.get("/:roomId/link", authUser, roomController.generateRoomLink);

// Admin can close a room
router.post("/close/:roomId", authAdmin, roomController.closeRoom);

// User can leave a room
router.post("/:roomId/leave", authUser, roomController.leaveRoom);

// Admin can remove a user from a room
router.post(
  "/:roomId/remove-user/:userId",
  authAdmin,
  roomController.removeUserFromRoom
);

// Validate room link
router.get(
  "/validate-link/:roomLink",
  authUser,
  roomController.validateRoomLink
);

module.exports = router;
