const jwt = require('jsonwebtoken');
const express = require("express");
require('dotenv').config();
const { getUserLogin, getUserSignUp } = require('../db/user');
const router = express.Router();

router.use(express.json());

router.post('/user/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await getUserLogin(email, password);

    if (!result) {
        return res.status(401).json({
            message: "No user found",
            token: false,
        });
    }

    const token = jwt.sign({ email }, process.env.TOKEN_SECRET, { expiresIn: "30d" });
    res.status(200).json({
        message: "User found",
        token: token,
    });
});

router.post('/user/signup', async (req, res) => {
    const {name, email, password } = req.body;
    const result = await getUserSignUp(name, email, password);

    if (!result) {
        return res.status(401).json({
            message: "User already exists",
            token: false,
        });
    }

    const token = jwt.sign({ email }, process.env.TOKEN_SECRET, { expiresIn: "30d" });
    res.status(200).json({
        message: "User signed up successfully",
        token: token,
    });
});

router.get('/verifyuser', async (req, res) => {
    const authHeader = req.headers.authorization
    const token = authHeader.split(' ')[1];
    console.log(token)

    try {
        const verify = jwt.verify(token, process.env.TOKEN_SECRET);
        res.status(200).json({
            message: "Valid token"
        });
    } catch (error) {
        res.status(401).json({
            message: "Invalid token"
        });
    }
});

module.exports = router;
