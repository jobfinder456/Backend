const express = require("express");
const router = express.Router();
const { createPayment } = require('../paypal/pay');

router.use(express.json());

// POST route for initiating a PayPal payment for a job
router.post('/create-payment', async (req, res) => {
  const { userId, jobId, price } = req.body;
  const successUrl = 'https://getjobs.today/success'; // Modify with your actual success URL
  const cancelUrl = 'https://getjobs.today/cancel';   // Modify with your actual cancel URL

  try {
    const paymentUrl = await createPayment(userId, jobId, price, successUrl, cancelUrl);
    res.json({ paymentUrl });
  } catch (error) {
    res.status(500);
  }
});

module.exports = router;
