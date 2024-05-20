// routes.js (or whatever your module file is named)
const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

dotenv.config();

const app = express();
app.use(express.json()); // To parse JSON request bodies

let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_MAIL, // generated ethereal user
    pass: process.env.SMTP_PASSWORD, // generated ethereal password
  },
});

const generateOTP = async (email) => {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  const OTP = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const selectQuery = `SELECT * FROM JB_USERS WHERE email = $1`;
  const selectValues = [email];
  const selectResult = await client.query(selectQuery, selectValues);

  if (selectResult.rows.length === 0) {
    const insertQuery = `INSERT INTO JB_USERS (email, otp) VALUES ($1, $2)`;
    const insertValues = [email, OTP];
    await client.query(insertQuery, insertValues);
  } else {
    const updateQuery = `UPDATE JB_USERS SET otp = $2 WHERE email = $1`;
    const updateValues = [email, OTP];
    await client.query(updateQuery, updateValues);
  }

  await client.end();

  return OTP;
};

const sendEmail = expressAsyncHandler(async (req, res) => {
  const { email } = req.body;

  const otp = await generateOTP(email);

  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject: "OTP from getjobs.today",
    text: `Your OTP is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      res.status(500).send("Error sending email");
    } else {
      res.status(200).send("Email sent successfully!");
    }
  });

  return otp;
});

const verifyOTP = expressAsyncHandler(async (req, res) => {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    const { email, otp } = req.body;

    const query = `SELECT * FROM JB_USERS WHERE email = $1 AND otp = $2`;
    const values = [email, otp];
    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      const token = jwt.sign({ email }, process.env.TOKEN_SECRET, { expiresIn: "30d" });
      res.status(200).json({ message: "User OTP is correct", token });
    } else {
      res.status(400).json({ message: "User OTP is incorrect" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.end();
  }
});

module.exports = { sendEmail, verifyOTP };
