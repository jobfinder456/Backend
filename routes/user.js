const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const {insertResume} = require("../db/job_function")

router.use(express.json());

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
      Key: `Resumes/${key}`,
      ContentType: contentType,
    });
    const fileLink = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/Resumes/${key}`;
    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 5 * 60,
    });
  
    return { fileLink, signedUrl };
  }

router.post("/s3resume", authMiddleware, async (req, res) => {
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

router.post("/resume", async(req,res)=>{
    try {
      const { name, email, fileLink, position } = req.body
      if( !name || !email || ! fileLink || !position ){
        return res.status(400).json({ error: "Missing required fields" });
      }
      const result = await insertResume(name,email,fileLink.position)
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
  })

module.exports = router;