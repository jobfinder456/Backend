const express = require("express");
const router = express.Router();
const paypal = require("@paypal/checkout-server-sdk");
const crypto = require("crypto");
const { jobUpdate } = require("../db/job_function");
const { otpSenderMail } = require("../db/mail");
const { authMiddleware } = require("../auth/middleware");

require("dotenv").config();

// PayPal Client Initialization
function environment() {
  return new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
  // Use paypal.core.LiveEnvironment for production
}

function paypalClient() {
  return new paypal.core.PayPalHttpClient(environment());
}

router.use(express.json());

// POST /create-payment
router.post("/create-payment", authMiddleware, async (req, res) => {
  console.log("entered");
  const { jobId: rawJobId, price } = req.body;
  const jobId = Array.isArray(rawJobId) ? rawJobId : [rawJobId];
  const num = jobId.length;

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");

  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: (price * num).toFixed(2),
        },
        description: `Payment for job(s): ${jobId.join(", ")}`,
      },
    ],
  });

  try {
    const response = await paypalClient().execute(request);

    // Extract the approve link
    const approveLink = response.result.links.find(
      (link) => link.rel === "approve"
    )?.href;

    if (!approveLink) {
      throw new Error("PayPal approval link not found in response");
    }

    res.json({ approveLink, orderId: response.result.id });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    res.status(401).json({ error: "Failed to create PayPal order" });
  }
});

// POST /verify-payment
router.post("/verify-payment", authMiddleware, async (req, res) => {
  const { orderId: paypalOrderId, jobId: rawJobId } = req.body;
  const email = req.email;

  try {
    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});

    const captureResponse = await paypalClient().execute(request);

    if (captureResponse.result.status !== "COMPLETED") {
      const subject = "Payment Failure Notification";
      const message = `Dear User, \n\nUnfortunately, your payment for job(s) ${rawJobId.join(
        ", "
      )} did not proceed successfully. Please try again. \n\nThanks,\nGetJobs Team`;

      await otpSenderMail(email, subject, message);
      return res.status(400).json({ msg: "Payment verification failed!" });
    }

    const jobId = Array.isArray(rawJobId) ? rawJobId : [rawJobId];
    await jobUpdate(jobId);

    const subject = "Payment Receipt";
    const message = `Dear User, \n\nThank you for your payment. Your payment for job(s) ${jobId.join(
      ", "
    )} has been processed successfully. \n\nOrder ID: ${paypalOrderId}\n\nThanks,\nGetJobs Team`;

    await otpSenderMail(email, subject, message);

    res.json({
      msg: "success",
      orderId: paypalOrderId,
      paymentStatus: "COMPLETED",
    });
  } catch (error) {
    console.error("Error verifying PayPal order:", error);

    const subject = "Payment Verification Failure";
    const message = `Dear User, \n\nWe encountered an error while verifying your payment for job(s) ${rawJobId.join(
      ", "
    )}. Please contact support for assistance. \n\nThanks,\nGetJobs Team`;

    await otpSenderMail(email, subject, message);

    res.status(401).json({ error: "Failed to verify PayPal order" });
  }
});

module.exports = router;
