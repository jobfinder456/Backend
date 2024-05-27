const express = require("express");
const router = express.Router();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, 
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.use(express.json());

router.post('/create-payment', async (req, res) => {
  const { jobId, price } = req.body;

  const options = {
    amount:  5000, // amount in the smallest currency unit
    currency: "INR",
    receipt: `receipt_order_${jobId}`
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});

module.exports = router;
