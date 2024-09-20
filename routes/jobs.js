const express = require("express");
const {
  getData,
  insertData,
  updateData,
  deleteData,
  getJobData,
  getuserjobData,
  insertMail,
} = require("../db/job_function");
const { authMiddleware } = require("../middleware");
const router = express.Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.use(express.json());

router.post("/insert-user-email", async (req, res) => {
  try {
    const { email } = req.body;
    await insertMail(email);
    res.status(200).json({ message: "Email saved" });
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/users-list", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const all = await getuserjobData(email);
    res.status(200).json({ all });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/list", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchTerm = req.query.search || "";
    const location = req.query.loc || "";
    const remote = req.query.remote ? req.query.remote === "true" : undefined;

    const offset = (page - 1) * limit;
    const all = await getData(offset, limit, searchTerm, location, remote);
    res.status(200).json({ all });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/job/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getJobData(id);
    res.status(200).json({ message: "Job found", result });
  } catch (error) {
    handleError(res, error);
  }
});

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

router.post( "/insert", authMiddleware, upload.single("image"), async (req, res) => {
    try {
      const {
        company_name,
        website,
        job_title,
        work_loc,
        commitment,
        remote,
        job_link,
        description,
        name,
        email,
      } = req.body;
      const image = req.file;

      const decEmail = req.email;

      if (email !== decEmail) {
        return res
          .status(403)
          .json({ message: "Different mail, correct your mail" });
      }

      if (
        !company_name ||
        !website ||
        !job_title ||
        !work_loc ||
        !commitment ||
        !remote ||
        !job_link ||
        !description ||
        !name ||
        !email
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let imageUrl;

      if (!image) {
        imageUrl = "false";
      } else {
        const imageBuffer = await sharp(image.buffer)
          .resize({ height: 400, width: 400, fit: "cover" })
          .toBuffer();

        const imageName = `${company_name}`;

        const params = {
          Bucket: "getjobs",
          Key: `images/${imageName}.png`,
          Body: imageBuffer,
          ContentType: image.mimetype,
        };

        await s3Client.send(new PutObjectCommand(params));
        imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
      }

      await insertData(
        company_name,
        website,
        imageUrl,
        job_title,
        work_loc,
        commitment,
        remote,
        job_link,
        description,
        name,
        email
      );
      res.status(201).json({ message: "Data inserted successfully" });
    } catch (error) {
      handleError(res, error);
    }
  }
);

router.put("/update/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_name,
      website,
      job_title,
      work_loc,
      commitment,
      remote,
      job_link,
      description,
    } = req.body;
    const result = await updateData(
      id,
      company_name,
      website,
      job_title,
      work_loc,
      commitment,
      remote,
      job_link,
      description
    );
    res.status(200).json({ message: "Data updated successfully", result });
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteData(id);
    res.status(200).json({ message: "Data deleted successfully", result });
  } catch (error) {
    handleError(res, error);
  }
});

function handleError(res, error) {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = router;
