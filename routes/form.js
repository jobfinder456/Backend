const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { insertProfile } = require("../db/job_function");
const { v4: uuidv4 } = require("uuid");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Pool } = require("pg");
const { authMiddleware } = require("../auth/middleware");

router.use(express.json());

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Helper function for executing database queries
async function executeQuery(query, values = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw new Error("Database operation failed");
  } finally {
    client.release();
  }
}

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
      Key: `images/${key}`,
      ContentType: contentType,
    });

    const fileLink = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/images/${key}`;
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 5 * 60 });

    return { fileLink, signedUrl };
  } catch (error) {
    console.error("S3 operation error:", error);
    throw new Error("Failed to generate pre-signed URL");
  }
}

// POST /profile - Insert user profile
router.post("/profile", authMiddleware, async (req, res) => {
  const { company_name, website, fileLink } = req.body;
  const email = req.email;

  // Input validation
  if (!company_name || !website || !fileLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await insertProfile(email, company_name, website, fileLink);

    if (result.success) {
      return res.status(201).json({ message: "Profile created successfully" });
    } else {
      return res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error("Error during profile creation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /profile - Fetch user profiles
router.get("/profile", authMiddleware, async (req, res) => {
  const email = req.email;

  try {
    const query = `
      SELECT 
        company_profile.id, 
        company_profile.company_name, 
        company_profile.website, 
        company_profile.image_url
      FROM 
        jb_users
      JOIN 
        company_profile 
        ON jb_users.id = company_profile.jb_user_id
      WHERE 
        jb_users.email = $1
    `;

    const profiles = await executeQuery(query, [email]);

    if (profiles.length === 0) {
      return res.status(404).json({ error: "No profiles found for this user" });
    }

    return res.status(200).json( profiles );
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /s3logo - Generate pre-signed S3 URL for logo upload
router.post("/s3logo", authMiddleware, async (req, res) => {
  const { contentType } = req.body;

  // Input validation
  if (!contentType) {
    return res.status(400).json({ error: "Content type is required" });
  }

  try {
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

module.exports = router;