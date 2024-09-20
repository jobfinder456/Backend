const jwt = require("jsonwebtoken");
const { Client } = require("pg");
require("dotenv").config();

async function otpCheck(email, otp) {
  const client = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
  });

  try {
    await client.connect();
    const query = `SELECT * FROM JB_USERS WHERE email = $1 AND otp = $2`;
    const values = [email, otp];
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return false; 
    }
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "30d" });
    return { token };
  } catch (error) {
    console.error("Error during OTP verification:", error);
    return false;
  } finally {
    await client.end();
  }
}

module.exports = {
  otpCheck
};
