const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { insertProfile } = require("../db/job_function");
const { v4: uuidv4 } = require("uuid");
const {
  PutObjectCommand,
  S3Client,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Pool } = require("pg");
const { authMiddleware } = require("../auth/middleware");


router.use(express.json());


const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
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
  console.log(key, " --- ", contentType);
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
        user_profile.id AS user_profile_id, 
        user_profile.company_name, 
        user_profile.website, 
        user_profile.image_url, 
        jb_jobs.job_title, 
        jb_jobs.description, 
        jb_jobs.work_loc, 
        jb_jobs.commitment, 
        jb_jobs.remote, 
        jb_jobs.level, 
        jb_jobs.compensation
      FROM 
        jb_users
      JOIN 
        user_profile 
        ON jb_users.id = user_profile.jb_user_id
      LEFT JOIN 
        jb_jobs 
        ON user_profile.id = jb_jobs.user_profile_id
      WHERE 
        jb_users.email = $1
    `;
    
    const profiles = await executeQuery(query, [email]);
    
    console.log(profiles);
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
