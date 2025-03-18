const express = require("express");
const pollController = require("../controllers/pollController");
const { authUser } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/create", authUser, pollController.createPoll);
router.post("/cast-vote", authUser, pollController.castVote);
router.get("/results/:pollId", authUser, pollController.getPollResults);

module.exports = router;
