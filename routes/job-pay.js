const express = require("express");
const router = express.Router();
const axios = require("axios");
const { otpSenderMail } = require("../db/mail");
const { authMiddleware } = require("../auth/middleware");

require("dotenv").config();

// Helper function to get PayPal access token
async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const tokenResponse = await axios.post(
    "https://api-m.paypal.com/v1/oauth2/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return tokenResponse.data.access_token;
}

// POST /create-subscription
router.post("/create-subscription", async (req, res) => {
  const { plan_id, card } = req.body;

  if (!plan_id || !card) {
    return res.status(400).json({
      success: false,
      message: "Plan ID and card details are required.",
    });
  }

  try {
    // Step 1: Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Step 2: Create subscription with card details
    const url = "https://api-m.paypal.com/v1/billing/subscriptions";
    const response = await axios.post(
      url,
      {
        plan_id,
        payer: {
          payment_method: "credit_card",
          funding_instruments: [
            {
              credit_card: {
                number: card.number,
                type: card.type, // "VISA", "MASTERCARD", etc.
                expire_month: card.expire_month,
                expire_year: card.expire_year,
                cvv2: card.cvv,
                first_name: card.first_name,
                last_name: card.last_name,
              },
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

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
router.post("/verify-subscription", async (req, res) => {
  const { subscriptionId , email } = req.body;
 // const email = req.email; // Assuming email is extracted using authMiddleware

  if (!subscriptionId) {
    return res.status(400).json({ success: false, message: "Subscription ID is required." });
  }

  try {
    // Step 1: Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Step 2: Verify the subscription using the PayPal API
    const url = `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const subscriptionStatus = response.data.status;

    // Step 3: Check subscription status
    if (subscriptionStatus === "ACTIVE") {
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
      // Handle non-active subscription statuses
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
    console.error("Error verifying PayPal subscription:", error.response?.data || error.message);

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
