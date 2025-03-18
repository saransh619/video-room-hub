const Poll = require("../models/Poll");

exports.createPoll = async (req, res) => {
  const { question, options, breakoutRoomId } = req.body;

  // Validate input
  if (!question || !options || options.length !== 4 || !breakoutRoomId) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const poll = new Poll({ question, options, breakoutRoomId });
    await poll.save();
    res.status(201).json({ pollId: poll._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.castVote = async (req, res) => {
  const { pollId, optionIndex } = req.body;

  try {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    // Validate optionIndex
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ error: "Invalid option index" });
    }

    // Cast vote
    poll.votes[optionIndex] += 1;
    await poll.save();

    res.status(200).json({ message: "Vote cast successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getPollResults = async (req, res) => {
  const { pollId } = req.params;

  try {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    res.status(200).json({
      question: poll.question,
      options: poll.options,
      votes: poll.votes,
      totalVotes: poll.votes.reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
