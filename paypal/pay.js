const paypal = require('paypal-rest-sdk');
require('dotenv').config();

paypal.configure({
  'mode': 'live', // sandbox or live
  'client_id': process.env.prod_Client_ID,
  'client_secret': process.env.prod_Secret_Key
});

const createPayment = (userId, jobId, price, successUrl, cancelUrl) => {
    const successUrlWithJobId = `${successUrl}?jobId=${encodeURIComponent(jobId)}`;
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
        resolve(payment.links.find(link => link.rel === 'approval_url').href);
      }
    });
  });
};

module.exports = { createPayment };
