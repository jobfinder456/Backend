const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { insertProfile } = require("../db/job_function");
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand, S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

router.use(express.json());

function keyFromFileLink(fileLink) {
    const s3 = new S3Client({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION
    });
    const s3UrlPrefix = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    return fileLink.replace(s3UrlPrefix, '');
}

async function createPreSignedPost(key, contentType){
    console.log(key , " --- ", contentType);
    const s3 = new S3Client({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION
    });
    const command = new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    const fileLink = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    const signedUrl = await getSignedUrl(s3, command, { 
        expiresIn: 5 * 60, 
    });
  
    return {fileLink, signedUrl};
  }
  
router.post("/profile", async (req, res) => {
    const { company_name, website, fileLink } = req.body;
    const email = "nikhilchopra1705@gmail.com"
    if (!company_name || !website || !fileLink) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const s3 = new S3Client({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION
    });
    const key = keyFromFileLink(fileLink);
    console.log("here is the new key", key)
    try {
      /* const command = new HeadObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: key,
        });
        await s3.send(command);
        */
        const result = await insertProfile(email,company_name,website,fileLink);
        if (result.success) {
            return res.status(201).json({
                message: "Data inserted successfully"
            });
        } else {
            return res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error("Error during profile creation:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/s3logo", async (req, res) => {
    try {
        const { contentType } = req.body;

        if (!contentType) {
            return res.status(400).send({
                status: "error",
                message: "Content type is required",
            });
        }

        const key = uuidv4(); 
        const { fileLink, signedUrl } = await createPreSignedPost(key, contentType);

        res.status(200).send({
            status: "success",
            data: { fileLink, signedUrl }
        });

    } catch (error) {
        console.error("Error generating signed URL:", error);

        res.status(500).send({
            status: "error",
            message: "Failed to generate signed URL",
        });
    }
});

module.exports = router;
