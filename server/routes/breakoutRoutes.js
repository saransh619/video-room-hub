const express = require("express");
const breakoutController = require("../controllers/breakoutController");
const { authUser, authAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create breakout room (admin only)
router.post("/create", authAdmin, breakoutController.createBreakoutRoom);

// Join breakout room
router.post(
  "/:breakoutRoomId/join",
  authUser,
  breakoutController.joinBreakoutRoom
);

// Leave breakout room
router.post(
  "/:breakoutRoomId/leave",
  authUser,
  breakoutController.leaveBreakoutRoom
);

// Get quiz questions for a breakout room
router.get(
  "/:breakoutRoomId/questions",
  authUser,
  breakoutController.getBreakoutQuestions
);

// End breakout room (admin only)
router.post(
  "/:breakoutRoomId/end",
  authAdmin,
  breakoutController.endBreakoutRoom
);

// Check if user is in a breakout room
router.get(
  "/check-status",
  authUser,
  breakoutController.checkUserBreakoutStatus
);

module.exports = router;
