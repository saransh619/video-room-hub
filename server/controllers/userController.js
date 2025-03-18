const User = require("../models/User");

getUserStatus = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ status: user.status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

updateUserStatus = async (req, res) => {
  const { userId, status } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status = status;
    await user.save();

    // Emit real-time update via Socket.IO
    req.io.emit("user-status-update", { userId, status });

    res.status(200).json({ message: "User status updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

getUserProfile = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUserStatus,
  updateUserStatus,
  getUserProfile,
  getAllUsers,
};
