const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { insertProfile } = require("../db/job_function");
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

router.use(express.json());

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
    const { company_name, website } = req.body;

    if (!company_name || !website) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    try {
        const result = await insertProfile(company_name, website);
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

        const key = uuidv4(); // Generate unique key for the file
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

// Function to extract the S3 key from the file link
function keyFromFileLink(fileLink) {
    const s3UrlPrefix = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    return fileLink.replace(s3UrlPrefix, '');
}

// Route to confirm that the file was uploaded successfully and save to DB
router.post("/confirm-upload", async (req, res) => {
    try {
        const { fileLink } = req.body;

        if (!fileLink) {
            return res.status(400).send({
                status: "error",
                message: "File link is required",
            });
        }

        // Extract S3 key from the fileLink
        const key = keyFromFileLink(fileLink);

        // Optional: Check if the file actually exists in S3 using HeadObjectCommand
        try {
            const command = new HeadObjectCommand({
                Bucket: process.env.BUCKET_NAME,
                Key: key,
            });
            await s3.send(command); // This will throw an error if the object does not exist
        } catch (s3Error) {
            console.error("Error: File does not exist in S3:", s3Error);
            return res.status(400).send({
                status: "error",
                message: "File was not uploaded to S3",
            });
        }

        // If the file exists, save the file link to the database
        await saveFileLinkToDatabase(fileLink); // Replace this with your actual DB logic

        res.status(200).send({
            status: "success",
            message: "File uploaded and saved successfully",
        });

    } catch (error) {
        console.error("Error confirming upload and saving file link:", error);

        res.status(500).send({
            status: "error",
            message: "Failed to confirm upload or save file link",
        });
    }
});


module.exports = router;
