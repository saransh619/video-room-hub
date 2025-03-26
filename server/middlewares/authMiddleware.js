const jwt = require("jsonwebtoken");

const authUser = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  const jwtToken = authHeader.split(" ")[1]?.trim();

  if (!jwtToken) {
    return res
      .status(401)
      .json({ error: "Access denied. Invalid token format." });
  }

  try {
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
};

const authAdmin = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  const jwtToken = token.split(" ")[1];

  try {
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied. Admin role required." });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
};

module.exports = { authUser, authAdmin };
