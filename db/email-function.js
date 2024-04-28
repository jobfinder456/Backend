const expressAsyncHandler = require("express-async-handler");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
dotenv.config();

let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_MAIL, // generated ethereal user
    pass: process.env.SMTP_PASSWORD, // generated ethereal password
  },
});

 let checker 

const generateOTP = () => {
  const OTP = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  checker = OTP

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
    } else {
      console.log("Email sent successfully!");
    }
  });

  return otp;
});

const verifyOTP = expressAsyncHandler(async (req, res) => {
  try {
    const { otp } = req.body;
    if (otp == checker) {
      res.status(200).json({ message: "User OTP is correct"});
    } else {
      res.status(400).json({ message: "User OTP is incorrect"});
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = { sendEmail, verifyOTP };
