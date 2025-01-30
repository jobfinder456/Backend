express = require("express");
const router = express.Router();
const axios = require("axios");
const { otpSenderMail } = require("../db/mail");
const { authMiddleware } = require("../auth/middleware");
const { updateCredits } = require("../db/user-pay");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Helper function for executing queries
async function executeQuery(query, values = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

// Helper function to get Razorpay auth credentials
function getRazorpayAuth() {
  return `Basic ${Buffer.from(
    `${process.env.RAZORPAY_TEST_KEY_ID}:${process.env.RAZORPAY_TEST_KEY_SECRET}`
  ).toString("base64")}`;
}

// Utility function for sending failure emails
async function sendFailureEmail(email, subject, message) {
  await otpSenderMail(email, subject, message);
}

// POST /create-subscription
router.post("/create-subscription", async (req, res) => {
  const { plan_id, quantity } = req.body;
  const total_count = 12; // 12 months subscription

  if (!plan_id || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Plan ID and quantity are required.",
    });
  }

  try {
    const url = "https://api.razorpay.com/v1/subscriptions";
    const response = await axios.post(
      url,
      { plan_id, total_count, quantity },
      {
        headers: {
          Authorization: getRazorpayAuth(),
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(201).json({
      success: true,
      subscription_id: response.data.id,
      status: response.data.status,
    });
  } catch (error) {
    console.error("Error creating subscription:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create subscription.",
      error: error.response?.data || error.message,
    });
  }
});

// POST /verify-subscription
router.post("/verify-subscription", authMiddleware, async (req, res) => {
  const { subscriptionId, plan_id } = req.body;
  const email = req.email;

  if (!subscriptionId || !plan_id) {
    return res.status(400).json({
      success: false,
      message: "Subscription ID and Plan ID are required.",
    });
  }

  try {
    const url = `https://api.razorpay.com/v1/subscriptions/${subscriptionId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: getRazorpayAuth(),
        "Content-Type": "application/json",
      },
    });

    const subscriptionStatus = response.data.status;

    if (subscriptionStatus !== "active") {
      const subject = "Subscription Activation Failure";
      const message = `Dear User,\n\nYour subscription (ID: ${subscriptionId}) could not be activated. Current status: ${subscriptionStatus}.`;
      await sendFailureEmail(email, subject, message);

      return res.status(400).json({
        success: false,
        message: `Subscription is not active. Current status: ${subscriptionStatus}`,
        subscriptionStatus,
      });
    }

    const creditMap = {
      "plan_Po2Z7yEL8Z7Qm1": 1000,
      "plan_PoTHJFNlL9SzHX": 10,
      "plan_PoTI8RZDB76ZyV": 25,
    };

    const credits = creditMap[plan_id];

    if (!credits) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan ID.",
      });
    }

    const result = await updateCredits(email, credits, subscriptionId, plan_id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User with the given email not found.",
      });
    }

    const subject = "Subscription Activated";
    const message = `Dear User,\n\nYour subscription (ID: ${subscriptionId}) has been successfully activated.`;
    await otpSenderMail(email, subject, message);

    return res.status(200).json({
      success: true,
      message: "Subscription verified and activated successfully.",
      subscriptionId,
      subscriptionStatus,
    });
  } catch (error) {
    console.error("Error verifying Razorpay subscription:", error.response?.data || error.message);
    const subject = "Subscription Verification Failure";
    const message = `Dear User,\n\nWe encountered an error while verifying your subscription (ID: ${subscriptionId}). Please contact support for assistance.`;
    await sendFailureEmail(email, subject, message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify subscription.",
      error: error.response?.data || error.message,
    });
  }
});

// POST /cancel-subscription
router.post("/cancel-subscription", authMiddleware, async (req, res) => {
  const { subscription_id } = req.body;
  const email = req.email;

  if (!subscription_id) {
    return res.status(400).json({
      success: false,
      message: "Subscription ID is required.",
    });
  }

  try {
    const subscriptionDetails = await axios.get(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}`,
      {
        auth: {
          username: process.env.RAZORPAY_TEST_KEY_ID,
          password: process.env.RAZORPAY_TEST_KEY_SECRET,
        },
      }
    );

    const expiryTimestamp = subscriptionDetails.data.current_end;

    if (!expiryTimestamp) {
      return res.status(400).json({
        success: false,
        message: "Could not fetch subscription expiration date.",
      });
    }

    await axios.post(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`,
      {},
      {
        auth: {
          username: process.env.RAZORPAY_TEST_KEY_ID,
          password: process.env.RAZORPAY_TEST_KEY_SECRET,
        },
      }
    );

    await executeQuery(
      `UPDATE jb_users SET sub_id = NULL, sub_expiry = TO_TIMESTAMP($1) WHERE email = $2`,
      [expiryTimestamp, email]
    );

    return res.status(200).json({
      success: true,
      message: `Subscription canceled successfully, credits will expire on ${new Date(expiryTimestamp * 1000).toLocaleString()}.`,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel subscription.",
      error: error.message,
    });
  }
});

// GET /get-subscription
router.get("/get-subscription", authMiddleware, async (req, res) => {
  const email = req.email;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  try {
    const query = `SELECT sub_id FROM jb_users WHERE email = $1`;
    const values = [email];

    const result = await executeQuery(query, values);

    if (!result || !result[0]?.sub_id) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found for this email.",
      });
    }

    const subscriptionId = result[0].sub_id;

    const razorpayResponse = await axios.get(
      `https://api.razorpay.com/v1/subscriptions/${subscriptionId}`,
      {
        auth: {
          username: process.env.RAZORPAY_TEST_KEY_ID,
          password: process.env.RAZORPAY_TEST_KEY_SECRET,
        },
      }
    );

    const { plan_id, customer_id, current_start, current_end, charge_at, end_at } = razorpayResponse.data;
    const planNames = {
      "plan_PoTHJFNlL9SzHX": "Starter",
      "plan_PoTI8RZDB76ZyV": "Companies",
    };
    const plan_name = planNames[plan_id] || "Unknown";

    return res.status(200).json({
      success: true,
      email,
      subscription_id: subscriptionId,
      plan_name,
      customer_id,
      current_start,
      current_end,
      charge_at,
      end_at,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription.",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router