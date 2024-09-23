const express = require("express");
const router = express.Router();
const path = require("path");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { insertProfile } = require("../db/job_function")
router.use(express.json());

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

router.post("/profile", async (req, res) => {
    const { company_name, website, name, email, contentType} = req.body;
    const { image } = req.body;

    if (!company_name || !website || !name || !email ) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const key = `company-images/${Date.now()}-${company_name}`;
    const command = new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        Body: image,
        ContentType: contentType,
    });

    const fileLink = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 5 * 60 });

    const result = await insertProfile(company_name, website, name, email, fileLink);
    
    if (result.success) {
        return res.status(201).json({ message: "Data inserted successfully", fileLink, signedUrl });
    } else {
        return res.status(400).json({ error: result.error });
    }
});
module.exports = router;