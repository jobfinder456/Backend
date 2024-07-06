const express = require("express");
const router = express.Router();
const path = require("path");
router.use(express.json());
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

router.post("/insertblog", async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: "Title and body are required" });
  }

  const params = {
    Bucket: 'getjobsblogs',
    Key: `blogs/${title}.json`,
    Body: JSON.stringify({ title, body }),
    ContentType: 'application/json',
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    res.status(200).json({ message: "Blog post uploaded successfully" });
  } catch (error) {
    console.error('Error uploading blog post:', error);
    res.status(500).json({ message: "Failed to upload blog post", error: error.message });
  }
});

router.get("/fetch", async(req,res)=>{
    
})
module.exports = router;
