const job = require("./jobs");
const profile = require("./form");
const pay = require("./job-pay");
const user = require("./user")
const express = require("express")
const router = express.Router()

router.use("/company", profile)
router.use("/job", job);
router.use("/pay", pay);
router.use("/user", user)

module.exports = router;