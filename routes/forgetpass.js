const express = require("express");
const { otpSenderMail } = require("../db/user-otp");
const { Client } = require("pg");
const router = express.Router();

router.use(express.json());

router.post("/forgetpass", async (req, res) => {
    const { email } = req.body;

    const client = new Client({
        connectionString: process.env.DB_CONNECTION_STRING,
    });

    try {
        await client.connect();
        const userQuery = 'SELECT * FROM JB_USERS WHERE email = $1';
        const userResult = await client.query(userQuery, [email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const otp = await otpSenderMail(email);
        const updateQuery = 'UPDATE JB_USERS SET otp = $1 WHERE email = $2';
        await client.query(updateQuery, [otp, email]);

        return res.status(200).json({ message: "OTP sent successfully", email: email });
    } catch (error) {
        console.error("Error during forget password process:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        await client.end();
    }
});

router.post("/resetpass", async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const client = new Client({
        connectionString: process.env.DB_CONNECTION_STRING,
    });

    try {
        await client.connect();
        const userQuery = 'SELECT * FROM JB_USERS WHERE email = $1';
        const userResult = await client.query(userQuery, [email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = userResult.rows[0];

        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updateQuery = 'UPDATE JB_USERS SET password = $1, otp = NULL WHERE email = $2';
        await client.query(updateQuery, [hashedPassword, email]);

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error during password reset process:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        await client.end();
    }
});

module.exports = router;