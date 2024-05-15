const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const jwt = require('jsonwebtoken');
const {Client} = require('pg');

dotenv.config();

const app = express();

let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_MAIL, // generated ethereal user
    pass: process.env.SMTP_PASSWORD, // generated ethereal password
  },
});

let checker; 

const generateOTP = () => {
  const OTP = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  checker = OTP;

  return OTP;
};

const sendEmail = expressAsyncHandler(async (req, res) => {
  const { email } = req.body;

  const otp = generateOTP();

  var mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject: "OTP from getjobs.today",
    text: `Your OTP is: ${otp}`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      res.status(500).send("Error sending email");
    } else {
      console.log("Email sent successfully!");
      res.status(200).send("Email sent successfully!");
      console.log("1");
    }
  });

  console.log("2");

  return otp;
});

const verifyOTP = expressAsyncHandler(async (req, res) => {
  const client = new Client({
    connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
});
try {
    await client.connect();
    const { email, otp } = req.body;
    console.log(email, otp);

    // Assuming `checker` is defined and holds the correct OTP value
    if (otp === checker) {
      const query = `SELECT * FROM JB_USERS WHERE email = $1`;
      const values = [email];
      const result = await client.query(query, values);

      if (result.rows.length == 0) {
        console.log("inin")
        const insertQuery = `INSERT INTO JB_USERS (email) VALUES ($1)`;
        await client.query(insertQuery, values);
      }

      const token = jwt.sign({ email }, process.env.TOKEN_SECRET, { expiresIn: "30d" });
      res.status(200).json({ message: "User OTP is correct", token });

    } else {
      res.status(400).json({ message: "User OTP is incorrect" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = { sendEmail, verifyOTP };
