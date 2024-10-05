const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { jobUpdate } = require("../db/job_function");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_TEST_KEY_ID,
  key_secret: process.env.RAZORPAY_TEST_KEY_SECRET,
});

router.use(express.json());

router.post("/create-payment", async (req, res) => {
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

router.post("/verify-payment", async (req, res) => {
  const { raz_pay_id, raz_ord_id, raz_sign, jobId: rawJobId } = req.body;
  try {
    const jobId = Array.isArray(rawJobId) ? rawJobId : [rawJobId];
    const sha = crypto.createHmac(
      "sha256",
      process.env.RAZORPAY_TEST_KEY_SECRET
    );
    sha.update(`${raz_ord_id}|${raz_pay_id}`);
    const digest = sha.digest("hex");
    if (digest !== raz_sign) {
      return res.status(400).json({ msg: "Transaction is not legit!" });
    }
    await jobUpdate(jobId);
    res.json({
      msg: "success",
      orderId: raz_ord_id,
      paymentId: raz_pay_id,
    });
  } catch (error) {
    console.error("Error verifying Razorpay order:", error);
    res.status(401).json({ error: "Failed to verify Razorpay order" });
  }
});

module.exports = router;
