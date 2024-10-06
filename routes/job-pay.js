const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { jobUpdate } = require("../db/job_function");
const { otpSenderMail } = require("../db/mail")
const { authMiddleware } = require("../auth/middleware")

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_TEST_KEY_ID,
  key_secret: process.env.RAZORPAY_TEST_KEY_SECRET,
});

router.use(express.json());

router.post("/create-payment", authMiddleware, async (req, res) => {
  const { jobId: rawJobId, price } = req.body;
  const jobId = Array.isArray(rawJobId) ? rawJobId : [rawJobId];
  num = jobId.length;
  const options = {
    amount: price * num, 
    currency: "INR",
    receipt: `receipt_order_${jobId}`,
  };
  try {
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(401).json({ error: "Failed to create Razorpay order" });
  }
});

router.post("/verify-payment", authMiddleware, async (req, res) => {
  const { raz_pay_id, raz_ord_id, raz_sign, jobId: rawJobId } = req.body;
  const email = req.email;
  try {
    const jobId = Array.isArray(rawJobId) ? rawJobId : [rawJobId];
    const sha = crypto.createHmac(
      "sha256",
      process.env.RAZORPAY_TEST_KEY_SECRET
    );
    sha.update(`${raz_ord_id}|${raz_pay_id}`);
    const digest = sha.digest("hex");

    if (digest !== raz_sign) {
      const subject = "Payment Failure Notification";
      const message = `Dear User, \n\nUnfortunately, your payment for job(s) ${jobId.join(
        ", "
      )} did not proceed successfully. Please try again. \n\nThanks,\nGetJobs Team`;

      await otpSenderMail(email, subject, message);
      return res.status(400).json({ msg: "Transaction is not legit!" });
    }

    await jobUpdate(jobId);

    const subject = "Payment Receipt";
    const message = `Dear User, \n\nThank you for your payment. Your payment for job(s) ${jobId.join(
      ", "
    )} has been processed successfully. \n\nOrder ID: ${raz_ord_id}\nPayment ID: ${raz_pay_id}\n\nThanks,\nGetJobs Team`;

    await otpSenderMail(email, subject, message);

    res.json({
      msg: "success",
      orderId: raz_ord_id,
      paymentId: raz_pay_id,
    });
  } catch (error) {
    console.error("Error verifying Razorpay order:", error);
    res.status(401).json({ error: "Failed to verify Razorpay order" });

    const subject = "Payment Verification Failure";
    const message = `Dear User, \n\nWe encountered an error while verifying your payment for job(s) ${rawJobId.join(
      ", "
    )}. Please contact support for assistance. \n\nThanks,\nGetJobs Team`;

    await otpSenderMail(email, subject, message);
  }
});

module.exports = router;
