const express = require("express");
const { getData, insertData, updateData, deleteData, getJobData, getuserjobData } = require('../db/job_function');
const { authMiddleware } = require('../middleware');
const router = express.Router();
const { v4: uuid } = require("uuid");
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require("multer");
const sharp = require("sharp");

require('dotenv').config();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.use(express.json());

router.post("/insert-email", async(req, res) =>{
    try {
        const email = req.body;
        const result = await insertmail(email)
        res.status(201).json({"email saved": result})
    } catch (error) {
        handleError(res, error);
    }
})

router.post("/users-list", authMiddleware, async (req, res) => {
    try {
        const { email } = req.body;
        const all = await getuserjobData(email);
        res.json({ all });
    } catch (error) {
        handleError(res, error);
    }
});

router.get("/list", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;

        const offset = (page - 1) * limit;
        
        const all = await getData(offset, limit);
        res.json({ all });
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/create-checkout-session', async (req, res) => {
    try {
        const { products } = req.body;
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

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: 'payment',
            success_url: "http://localhost:5173/success",
            cancel_url: "http://localhost:5173/cancel",
        });

        res.json({ id: session.id });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/session-status', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
        res.send({
            status: session.status,
            customer_email: session.customer_details.email
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get("/job/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await getJobData(id);
        res.status(201).json({ message: "Job found", result });
    } catch (error) {
        handleError(res, error);
    }
});

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION
});

router.post("/insert", upload.single('image'), async (req, res) => {
    try {
        const { company_name, website, job_title, work_loc, commitment, remote, job_link, description, name, email } = req.body;
        const image = req.file;

        let imageUrl;

        if (!company_name || !website || !job_title || !work_loc || !commitment || !remote || !job_link || !description || !name || !email) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!image) {
            // Use a local default image URL
            imageUrl = 'https://example.com/default-image.png';
        } else {
            const imageBuffer = await sharp(image.buffer)
                .resize({ height: 1920, width: 1080, fit: "contain" })
                .toBuffer();

            const imageName = `${company_name}`;

            const params = {
                Bucket: 'jobfinderimage',
                Key: `images/${imageName}.png`,
                Body: imageBuffer,
                ContentType: image.mimetype
            };

            await s3Client.send(new PutObjectCommand(params));
            imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
        }

        const result = await insertData(company_name, website, imageUrl, job_title, work_loc, commitment, remote, job_link, description, name, email);
        res.status(201).json({ message: "Data inserted successfully", result });
    } catch (error) {
        handleError(res, error);
    }
});

router.put("/update/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { company_name, website, job_title, work_loc, commitment, remote, job_link, description } = req.body;
        const result = await updateData(id, company_name, website, job_title, work_loc, commitment, remote, job_link, description);
        res.status(201).json({ message: "Data updated successfully", result });
    } catch (error) {
        handleError(res, error);
    }
});

router.delete("/delete/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteData(id);
        res.status(201).json({ message: "Data deleted successfully", result });
    } catch (error) {
        handleError(res, error);
    }
});

function handleError(res, error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
}

module.exports = router;
