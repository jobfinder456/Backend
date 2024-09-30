require("dotenv").config();
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token)
  if (!token) {
    return res.status(403).json({ message: "Access denied. No token provided." });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.email = decoded.email; 
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

module.exports = {
  authMiddleware,
};
