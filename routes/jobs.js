const express = require("express");
const { getData, insertData, updateData, deleteData, getJobData, getuserjobData } = require('../db/job');
const zod = require("zod")
const {authMiddleware} = require('../middleware')
const router = express.Router();
const { v4: uuid } = require("uuid");
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();
const multer = require("multer");
const sharp = require("sharp");

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

router.use(express.json());
/*
const postSchema = zod.object({
    company_name: zod.string().min(1),
    website: zod.string().min(5),
    job_title: zod.string().min(5),
    work_loc: zod.string().min(2),
    remote: zod.boolean(),
    job_link: zod.string().min(3),
    description: zod.string().min(50),
})
*/

router.post("/users-list", authMiddleware, async(req,res)=>{
    const {email} = req.body
    const all = await getuserjobData(email)
    res.json({ all })
})

router.get("/list", async (req, res) => {
    const all = await getData();
    res.json({ all });
});
//stripe code
/*router.post("/payment", async (req, res) => {
    console.log("1");

    const { token, product } = req.body;
    const idempotencyKey = uuid();
    
    try {
        const customer = await stripe.customers.create({
            email: token.email,
            source: 'tok_mastercard',
        });

        console.log(token.email , customer.id, product.price, idempotencyKey)

        console.log("2");
        
        const charge = await stripe.charges.create({
            customer: customer.id,
            amount: product.price * 100,
            currency: 'usd',
            description: 'job fee',
            receipt_email: token.email,
        }, {
            idempotencyKey: idempotencyKey,
        });

        console.log("Payment successful:", charge);
        res.status(200).json({ message: "Payment successful", charge });
    } catch (err) {
        console.log("4");
        console.error(err);
        res.status(500).json({ error: "An error occurred while processing the payment" });
    }
});*/

router.post('/create-checkout-session', async (req, res) => {
    const {products} = req.body
    console.log(products)

    const lineItems = products.map((product) => ({
        price_data: {
            currency: "usd",
            product_data: {
                name: product.id
            },
            unit_amount: product.price * 100,
        },
        quantity: 1, 
        
    }));

    console.log(lineItems)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: 'payment',
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/cancel",
    });

    res.json({id: session.id})
  
  });
  
  
  router.get('/session-status', async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
  
    res.send({
      status: session.status,
      customer_email: session.customer_details.email
    });
  });


router.get("/job/:id", async(req, res) => {
    const { id } = req.params;
    try {
        const result = await getJobData(id)
        res.status(201).json({ message: "Job found", result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

const s3Client = new S3Client({
    credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION
  });
router.post("/insert",  upload.single('image'),async (req, res) => {
    // Ensure req.body is properly parsed before accessing its properties

    const { company_name, website, job_title, work_loc, commitment, remote, job_link, description, name, email } = req.body;
    const image = req.file
    const imageBuffer = await sharp(image.buffer)
    .resize({ height: 1920, width: 1080, fit: "contain" })
    .toBuffer()
    const imageName = `${company_name}`
    try {
        const params = {
            Bucket: 'jobfinderimage',
            Key: `images/${imageName}.png`,
            Body: imageBuffer,
            ContentType: image.mimetype
          };
          await s3Client.send(new PutObjectCommand(params));
          const imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
        const result = await insertData(company_name, website, imageUrl, job_title, work_loc, commitment, remote, job_link, description, name, email);
        res.status(201).json({ message: "Data inserted successfully", result });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/update/:id", authMiddleware, async(req,res) => {

    const { id } = req.params
    const { company_name, website, job_title, work_loc, commitment, remote, job_link, description } = req.body;

    try {

        const result = await updateData(id,company_name, website, job_title, work_loc, commitment, remote, job_link, description);
        res.status(201).json({ message: "Data updated successfully", result });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.delete("/delete/:id", authMiddleware, async(req,res)=>{
  const { id }= req.params 
  try {
    const result = await deleteData(id);
    res.status(201).json({ message: "Data deleted successfully", result });
} catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
}
})
module.exports = router;
