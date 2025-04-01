const express = require("express");
const twilio = require("twilio");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

if (!accountSid || !authToken || !apiKeySid || !apiKeySecret) {
  console.error("Twilio credentials are not set in the environment variables");
  throw new Error(
    "Twilio credentials are not set in the environment variables"
  );
}

const client = twilio(accountSid, authToken);

router.get("/generate-token", (req, res) => {
  const { identity, roomId } = req.query;

  // Validate the identity and roomId
  if (!identity || typeof identity !== "string" || identity.trim() === "") {
    return res.status(400).json({ error: "Invalid or missing identity" });
  }

  if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
    return res.status(400).json({ error: "Invalid or missing roomId" });
  }

  try {
    // Create an access token with the identity in the options
    const token = new twilio.jwt.AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      {
        identity: identity.trim(),
      }
    );

    // Grant access to the Video API
    const videoGrant = new twilio.jwt.AccessToken.VideoGrant({
      room: roomId.trim(), // The room the user will join
    });
    token.addGrant(videoGrant);

    // Generate the JWT token
    const jwt = token.toJwt();

    res.json({ token: jwt });
  } catch (error) {
    console.error("Error generating Twilio access token:", error);
    res.status(500).json({ error: "Failed to generate access token" });
  }
});

module.exports = router;
