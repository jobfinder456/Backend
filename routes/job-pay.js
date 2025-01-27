const express = require("express");
const router = express.Router();
const axios = require("axios");
const { otpSenderMail } = require("../db/mail"); // Assuming you use this for email notifications
const { authMiddleware} = require("../auth/middleware")
require("dotenv").config();

// Helper function to get Razorpay access credentials
function getRazorpayAuth() {
  return `Basic ${Buffer.from(
    `${process.env.RAZORPAY_TEST_KEY_ID}:${process.env.RAZORPAY_TEST_KEY_SECRET}`
  ).toString("base64")}`;
}

// POST /create-subscription
router.post("/create-subscription", authMiddleware, async (req, res) => {
  const { plan_id, quantity } = req.body;
  const total_count = 12; // 12 months (1 year) subscription

  if (!plan_id || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Plan ID, total count, and quantity are required.",
    });
  }

  try {
    // Step 1: Create subscription with Razorpay
    const url = "https://api.razorpay.com/v1/subscriptions";
    const response = await axios.post(
      url,
      {
        plan_id,
        total_count, // Number of billing cycles (e.g., 12 months)
        quantity, // Units of the plan
      },
      {
        headers: {
          Authorization: getRazorpayAuth(),
          "Content-Type": "application/json",
        },
      }
    );

    // Step 2: Return success response
    res.status(201).json({
      success: true,
      subscription_id: response.data.id,
      status: response.data.status,
    });
  } catch (error) {
    console.error("Error creating subscription:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create subscription.",
      error: error.response?.data || error.message,
    });
  }
});

// POST /verify-subscription
router.post("/verify-subscription", authMiddleware, async (req, res) => {
  const { subscriptionId, plan_id } = req.body;
  const email = req.email

  if (!subscriptionId || !plan_id) {
    return res.status(400).json({ success: false, message: "Subscription ID is required." });
  }

  try {
    // Step 1: Verify subscription status with Razorpay
    const url = `https://api.razorpay.com/v1/subscriptions/${subscriptionId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: getRazorpayAuth(),
        "Content-Type": "application/json",
      },
    });

    const subscriptionStatus = response.data.status;

    // Step 2: Check subscription status
    if (subscriptionStatus === "active") {
      if(plan_id="plan_PoTHJFNlL9SzHX"){
      const result = await updateCredits(email, 10);

      if (!result) {
          return res.status(404).json({
              success: false,
              message: "User with the given email not found.",
          });
      }
    }
    
    if(plan_id="plan_PoTI8RZDB76ZyV"){
      const result = await updateCredits(email, 25)
      if (!result) {
          return res.status(404).json({
              success: false,
              message: "User with the given email not found.",
          });
      }
    }
    
      const subject = "Subscription Activated";
      const message = `Dear User,\n\nYour subscription (ID: ${subscriptionId}) has been successfully activated.\n\nThanks,\nGetJobs Team`;

      // Send confirmation email
      await otpSenderMail(email, subject, message);

      return res.status(200).json({
        success: true,
        message: "Subscription verified and activated successfully.",
        subscriptionId,
        subscriptionStatus,
      });
    } else {
      const subject = "Subscription Activation Failure";
      const message = `Dear User,\n\nYour subscription (ID: ${subscriptionId}) could not be activated. Current status: ${subscriptionStatus}.\n\nThanks,\nGetJobs Team`;

      // Send failure notification email
      await otpSenderMail(email, subject, message);

      return res.status(400).json({
        success: false,
        message: `Subscription is not active. Current status: ${subscriptionStatus}.`,
        subscriptionStatus,
      });
    }
  } catch (error) {
    console.error("Error verifying Razorpay subscription:", error.response?.data || error.message);

    const subject = "Subscription Verification Failure";
    const message = `Dear User,\n\nWe encountered an error while verifying your subscription (ID: ${subscriptionId}). Please contact support for assistance.\n\nThanks,\nGetJobs Team`;

    // Send error notification email
    await otpSenderMail(email, subject, message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify subscription.",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
