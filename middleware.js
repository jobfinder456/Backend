require('dotenv').config();
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("11")

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(authHeader)
        return res.status(403).json({});
    }

    const token = authHeader.split(' ')[1];
    console.log(token)

    try {
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        console.log(decoded)
        req.email = decoded.email;

        next();
    } catch (error) {
        return res.status(403).json({ error: error.message || "Internal Server Error" });
    }
};

module.exports = {
    authMiddleware
}