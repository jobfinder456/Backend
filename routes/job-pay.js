const express = require("express");
const router = express.Router();
const { createPayment } = require('../paypal/pay');

router.use(express.json());

// POST route for initiating a PayPal payment for a job
router.post('/create-payment', async (req, res) => {
  const { userId, jobId, price } = req.body;
  const successUrl = 'http://example.com/success'; // Modify with your actual success URL
  const cancelUrl = 'http://example.com/cancel';   // Modify with your actual cancel URL

  try {
    const paymentUrl = await createPayment(userId, jobId, price, successUrl, cancelUrl);
    res.json({ paymentUrl });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

module.exports = router;
