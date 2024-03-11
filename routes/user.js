const jwt = require('jsonwebtoken')
const express = require("express");
const {getUserLogin} = require('../db/user')
const router = express.Router();

router.use(express.json());

router.post('/user/login', async(req, res) => {
    const {email, password} = req.body
    const result = await getUserLogin(email, password)

    if(!result) {
        res.status(401).json({
            message: "no user found",
            token: false,
        })
    }

    const token = jwt.sign({email}, process.env.TOKEN_SECRET, {expiresIn: "30d"})
    res.status(200).json({
        message: " user found",
        token: token,
    })
})

router.post('/user/signup', async(req, res) => {
    const {email, password} = req.body
    const result = await getUserSignUp(email, password)

    if(!result) {
        res.status(401).json({
            message: "user already present ",
            token: false,
        })
    }

    const token = jwt.sign({email}, process.env.TOKEN_SECRET, {expiresIn: "30d"})
    res.status(200).json({
        message: " user found",
        token: token,
    })
})

router.get('/verifyuser', async(req, res) => {
    const {token} = req.body
    const verify = jwt.verify(token, process.env.TOKEN_SECRET)

    if(!verify){
        res.status(200).json({
            message: " token expired verify"
        })
    }

    res.status(200).json({
        message: " valid token "
    })
})

module.exports = router;