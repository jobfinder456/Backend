const express = require("express");
const router = express.Router();
const path = require("path");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { insertResume } = require("../db/job_function");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

router.use(express.json());

// Helper function to generate a pre-signed S3 URL
async function createPreSignedPost(key, contentType) {
  try {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      region: process.env.AWS_REGION,
    });

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `Resumes/${key}`,
      ContentType: contentType,
    });

    const fileLink = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/Resumes/${key}`;
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 5 * 60 });

    return { fileLink, signedUrl };
  } catch (error) {
    console.error("S3 operation error:", error);
    throw new Error("Failed to generate pre-signed URL");
  }
}

// POST /s3resume - Generate pre-signed S3 URL for resume upload
router.post("/s3resume", async (req, res) => {
  try {
    const { contentType } = req.body;

    // Input validation
    if (!contentType) {
      return res.status(400).json({ error: "Content type is required" });
    }

    const key = uuidv4();
    const { fileLink, signedUrl } = await createPreSignedPost(key, contentType);

    return res.status(200).json({
      status: "success",
      data: { fileLink, signedUrl },
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

// POST /resume - Insert resume data
router.post("/resume", async (req, res) => {
  try {
    const { name, email, fileLink, position } = req.body;

    // Input validation
    if (!name || !email || !fileLink || !position) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await insertResume(name, email, fileLink, position);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      status: "success",
      message: "Resume data inserted successfully",
    });
  } catch (error) {
    console.error("Error inserting resume data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;