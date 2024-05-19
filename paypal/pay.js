const paypal = require('paypal-rest-sdk');
require('dotenv').config();
const uuid = require('uuid');

// Global variable to store check IDs
let checkIds;

paypal.configure({
  'mode': process.env.Paypal_Mode, // sandbox or live
  'client_id': process.env.Client_ID,
  'client_secret': process.env.Secret_Key
});

const createPayment = (userId, jobId, price, successUrl, cancelUrl) => {
    const checkId = uuid.v4(); // Generate a new UUID for the check ID
    checkIds = checkId; // Store the check ID in the global variable

    const successUrlWithJobId = `${successUrl}?jobId=${encodeURIComponent(jobId)}&checkId=${encodeURIComponent(checkId)}`;
    const cancelUrlWithJobId = `${cancelUrl}?jobId=${encodeURIComponent(jobId)}`;

  const paymentData = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal'
    },
    redirect_urls: {
      return_url: successUrlWithJobId,
      cancel_url: cancelUrlWithJobId
    },
    transactions: [{
      item_list: {
        items: [{
          name: 'Job Payment',
          sku: jobId,
          price: price,
          currency: 'USD',
          quantity: 1
        }]
      },
      amount: {
        currency: 'USD',
        total: price
      },
      description: `Payment for Job ID: ${jobId} by USERID: ${userId}`
    }]
  };

  return new Promise((resolve, reject) => {
    paypal.payment.create(paymentData, (error, payment) => {
      if (error) {
        reject(error);
      } else {
        resolve({ approvalUrl: payment.links.find(link => link.rel === 'approval_url').href, checkId });
      }
    });
  });
};

module.exports = { createPayment };
