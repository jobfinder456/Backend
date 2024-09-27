require("dotenv").config();
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(403).json({ message: "Access denied. No token provided." });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    req.email = decoded.email; // Attach email to req object
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

module.exports = {
  authMiddleware,
};
