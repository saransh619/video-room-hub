const express = require("express");
const userController = require("../controllers/userController");
const { authUser, authAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/update-status", authUser, userController.updateUserStatus);
router.get("/:userId/status", authUser, userController.getUserStatus);
router.get("/profile/:userId", authUser, userController.getUserProfile);
router.get("/list", authAdmin, userController.getAllUsers);

module.exports = router;
