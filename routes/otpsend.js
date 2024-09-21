const express = require("express");
const { otpCheck } = require("../db/otpcheck");
const router = express.Router();

router.use(express.json());

router.post("/check", async (req, res) => {
  const { email, otp } = req.body;
  console.log(email ,"-----", otp)

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const verified = await otpCheck(email, otp);
    if (verified) {
      res.cookie("token", verified.token, { httpOnly: true });
      res.status(200).json({ message: "User authorized", email });
    } else {
      res.status(401).json({ message: "Invalid OTP or email" });
    }
  } catch (error) {
    console.error("Error in /check route:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
