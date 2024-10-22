const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { insertProfile } = require("../db/job_function");
const { v4: uuidv4 } = require("uuid");
const {
  PutObjectCommand,
  S3Client
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Pool } = require("pg");
const { authMiddleware } = require("../auth/middleware");


router.use(express.json());


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function executeQuery(query, values = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

async function createPreSignedPost(key, contentType) {
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
  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 5 * 60,
  });

  return { fileLink, signedUrl };
}

router.post("/profile", authMiddleware, async (req, res) => {
  const { company_name, website, fileLink } = req.body;
  const email = req.email;
  if (!company_name || !website || !fileLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try{
    const result = await insertProfile(email, company_name, website, fileLink);
    if (result.success) {
      return res.status(201).json({
        message: "Data inserted successfully",
      });
    } else {
      return res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error("Error during profile creation:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

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
    res.status(200).send(profiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).send({
      status: "error",
      message: "Failed to get the profiles",
    });
  }
});


router.post("/s3logo", authMiddleware, async (req, res) => {
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
      data: { fileLink, signedUrl },
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
