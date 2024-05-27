const Razorpay = require('razorpay');
var instance = new Razorpay({ key_id: process.env.key_id, key_secret: process.env.key_secret })

var options = {
  amount: 100,  // amount in the smallest currency unit
  currency: "INR",
  receipt: "order_rcptid_11"
};
instance.orders.create(options, function(err, order) {
  console.log(order);
});