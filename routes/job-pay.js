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

async function executeQuery(query, values = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw new Error("Database operation failed");
  } finally {
    client.release();
  }
}

function getRazorpayAuth() {
  return `Basic ${Buffer.from(
    `${process.env.RAZORPAY_TEST_KEY_ID}:${process.env.RAZORPAY_TEST_KEY_SECRET}`
  ).toString("base64")}`;
}

router.post("/create-subscription", authMiddleware, async (req, res) => {
  const { plan_id, quantity } = req.body;
  const email = req.email
  const total_count = 12; // 12 months subscription
  const query = `SELECT sub_id, status FROM jb_users WHERE email = $1`;
    const values = [email];

        const result = await executeQuery(query, values); // Execute the query
        if (result.length == 0 || result[0].sub_id == null){
            return res.status(404).json({ success: false, message: "Subscription not found for this email." });
        }
        
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
      error: "Internal server error",
    });
  }
});

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
    if (subscriptionStatus === "active") {
      if(plan_id==="plan_Po2Z7yEL8Z7Qm1"){
        const result = await updateCredits(email, 1000, subscriptionId, plan_id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "User with the given email not found.",
            });
        }
      }
      if(plan_id==="plan_PoTHJFNlL9SzHX"){
      const result = await updateCredits(email, 10, subscriptionId, plan_id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User with the given email not found.",
      });
    }
  }
    const subject = "Subscription Activated";
    const message = `Dear User,\n\nYour subscription (ID: ${subscriptionId}) has been successfully activated.`;
    otpSenderMail(email, subject, message);
    console.log("1 all done")
    return res.status(200).json({
      success: true,
      message: "Subscription verified and activated successfully.",
      subscriptionId,
      subscriptionStatus,
    });
  } 
  }catch (error) {
    console.error("Error verifying Razorpay subscription:", error.response?.data || error.message);

    const subject = "Subscription Verification Failure";
    const message = `Dear User,\n\nWe encountered an error while verifying your subscription (ID: ${subscriptionId}). Please contact support for assistance.`;
    await sendFailureEmail(email, subject, message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify subscription.",
      error: "Internal server error",
    });
  }
});

router.post("/cancel-subscription", authMiddleware, async (req, res) => {
  const { subscription_id, } = req.body;
  const email = req.email;

  if (!subscription_id) {
    return res.status(400).json({
      success: false,
      message: "Subscription ID is required.",
    });
  }

  try {
      // Cancel the subscription
      const response = await axios.post(
        `https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`,
        { "cancel_at_cycle_end":1 },
        {
            auth: {
                username: process.env.RAZORPAY_TEST_KEY_ID,  // Ensure you're using the correct key
                password: process.env.RAZORPAY_TEST_KEY_SECRET
            }
        }
    );
    const expiryTimestamp = response.data.current_end;
    if (!expiryTimestamp) {
      return res.status(400).json({
        success: false,
        message: "Could not fetch subscription expiration date.",
      });
    }
    console.log('Expiry Timestamp:', expiryTimestamp);
    console.log('Expiry Timestamp as number:', Number(expiryTimestamp));

     const check =  await executeQuery(
  `UPDATE jb_users SET status = $3, sub_expiry = TO_TIMESTAMP($1) WHERE email = $2 RETURNING *`,
  [Number(expiryTimestamp), email, "cancel"]
      );
        console.log(check)
      // Extract the data from the response object
      const responseData = response.data;  // Get only the 'data' from the response

      return res.status(200).json({
          success: true,
          message: "Subscription canceled successfully.",
          subscription: responseData,  // Return the extracted 'data'
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

router.post("/upgrade-subscription", authMiddleware,async (req, res) => {
  const { subscription_id, new_plan_id, quantity, total_count } = req.body;
  const email = req.email

  if (!subscription_id || !new_plan_id) {
      return res.status(400).json({
          success: false,
          message: "Current subscription ID and new plan ID are required.",
      });
  }

  try {
      // Debugging: Log the subscription ID and new plan ID
      console.log("Subscription ID:", subscription_id);
      console.log("New Plan ID:", new_plan_id);

      // Step 1: Fetch the current subscription to ensure it exists
      const existingSubscription = await axios.get(
          `https://api.razorpay.com/v1/subscriptions/${subscription_id}`,
          {
              auth: {
                  username: process.env.RAZORPAY_TEST_KEY_ID,  // Ensure you're using the correct key
                  password: process.env.RAZORPAY_TEST_KEY_SECRET
              }
          }
      );

      if (!existingSubscription.data) {
          return res.status(404).json({
              success: false,
              message: "Current subscription not found."
          });
      }

      // Step 2: Cancel the current subscription
      await axios.post(
          `https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`,
          {},
          {
              auth: {
                  username: process.env.RAZORPAY_TEST_KEY_ID,  // Ensure you're using the correct key
                  password: process.env.RAZORPAY_TEST_KEY_SECRET
              }
          }
      );

      const newSubscription = await axios.post(
          `https://api.razorpay.com/v1/subscriptions`,
          {
              plan_id: new_plan_id,
              total_count: total_count || 12, // Defaults to 12 cycles if not provided
              customer_notify: 1,
              quantity: quantity || 1, // Defaults to 1 if not provided
          },
          {
              auth: {
                  username: process.env.RAZORPAY_TEST_KEY_ID,  // Ensure you're using the correct key
                  password: process.env.RAZORPAY_TEST_KEY_SECRET
              }
          }
      );
      const newSubscriptionId = newSubscription.data.id;
      const subscriptionStatus = newSubscription.data.status;

    // Step 2: Check subscription status
    if (subscriptionStatus === "active") {
      await executeQuery(
        `UPDATE jb_users SET sub_id = $1 WHERE email = $2`,
        [newSubscriptionId, email]
    );
    return res.status(200).json({
      success: true,
      message: "Subscription upgraded successfully.",
      subscription: newSubscription.data,
  });
  }else{
      return res.status(402).json({
          success: false,
          message: "Subscription payment could not be verified",
          subscription: newSubscription.data,
      });
    }
  } catch (error) {
      console.error("Error upgrading subscription:", error.response?.data || error.message);
      return res.status(500).json({
          success: false,
          message: "Failed to upgrade subscription.",
          error: error.response?.data || error.message,
      });
  }
});

router.get("/get-subscription", authMiddleware, async (req, res) => {
    const email = req.email;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required." });
    }

  try {
    const query = `SELECT sub_id, status FROM jb_users WHERE email = $1`;
    const values = [email];

        const result = await executeQuery(query, values); // Execute the query
        if (result.length == 0 || result[0].sub_id == null){
            return res.status(404).json({ success: false, message: "Subscription not found for this email." });
        }
        console.log(result)
        const subscriptionId = result[0].sub_id;
        // Fetch subscription details from Razorpay API
        const razorpayResponse = await axios.get(
            `https://api.razorpay.com/v1/subscriptions/${subscriptionId}`,
            {
                auth: {
                    username: process.env.RAZORPAY_TEST_KEY_ID,   // Razorpay API Key
                    password: process.env.RAZORPAY_TEST_KEY_SECRET,   // Razorpay API Secret
                },
            }
        );
        console.log(razorpayResponse)
        
        if (!razorpayResponse ) {
          return res.status(400).json({ success: false, message:"no subscription found" });
      }
        const { plan_id, customer_id, current_start, current_end, charge_at, end_at } = razorpayResponse.data;

        let plan_name = "Unknown"; 
        if (plan_id === "plan_Po2Z7yEL8Z7Qm1") {
            plan_name = "Starter";
        } else if (plan_id === "plan_PpJsHEenU2Bkid") {
            plan_name = "Growth";
        }
        if(result[0].status  == "active"){
        return res.status(200).json({
            success: true,
            email: email,
            subscription_id: subscriptionId,
            plan_name,
            customer_id,
            current_start,
            current_end,
            charge_at,
            end_at,
        });}
        if(result[0].status == "cancel"){
          return res.status(200).json({
            success: true,
            message:`Your subscription has been canceled`,
            email: email,
            subscription_id: subscriptionId,
            plan_name,
            customer_id,
            current_start,
            current_end,
            charge_at,
            end_at,
        });
        }
        return res.status(200).json({
            success: true,
            message:`Your subscription is normal`,
            email: email,
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

module.exports = router;