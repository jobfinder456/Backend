const express = require("express");
const bcrypt = require("bcryptjs");
const { Client } = require("pg");
const { otpSenderMail } = require("../db/user-otp");
require("dotenv").config();
const router = express.Router();

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const client = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
  });

  try {
    await client.connect();

    const query = `SELECT * FROM JB_USERS WHERE email = $1`;
    const result = await client.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User does not exist" });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const newOtp = await otpSenderMail(email);
    
    if (!newOtp) {
      return res.status(500).json({ error: "Failed to send OTP" });
    }

    const updateOtpQuery = `UPDATE JB_USERS SET otp = $1 WHERE email = $2`;
    await client.query(updateOtpQuery, [newOtp, email]);

    return res.status(200).json({ success: true, message: "OTP sent to your email", email });

  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.end();
  }
});

module.exports = router;
