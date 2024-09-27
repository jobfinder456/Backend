const express = require("express");
const {
  getData,
  insertData,
  updateJob,
  deleteJob,
  getJobById,
  getuserjobData,
  getUserProfileByEmail
} = require("../db/job_function");
const { authMiddleware } = require("../auth/middleware");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

router.use(express.json());

const validateJobFields = (body) => {
  const {
    company_name,
    website,
    s3_url,
    job_title,
    work_loc,
    commitment,
    remote,
    job_link,
    description,
    categories,
    level,
    compensation,
    name
  } = body;

  if (
    !company_name||
    !website||
    !s3_url||
    !job_title ||
    !work_loc ||
    !commitment ||
    typeof remote === "undefined" ||  
    !job_link ||
    !description ||
    !categories ||
    !level ||
    !compensation ||
    !name
  ) {
    return false;
  }
  return true;
};

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

router.get("/jobs/:id", async (req, res) => {
  const jobId = req.params.id;

  try {
    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/insert", authMiddleware, async (req, res) => {
  try {
    const {
      company_name,
      website,
      s3_url,
      job_title,
      work_loc,
      commitment,
      remote,
      job_link,
      description,
      categories,
      level,
      compensation,
      name,
      email
    } = req.body;
    
    const user_email = req.email

    if (!validateJobFields(req.body)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const profile = await getUserProfileByEmail(user_email);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    await insertData(
      profile.id,
      company_name,
      website,
      s3_url,
      job_title,
      work_loc,
      commitment,
      remote,
      job_link,
      description,
      categories,
      level,
      compensation,
      name,
      email
    );
    res.status(201).json({ message: "Job inserted successfully" });
  } catch (error) {
    handleError(res, error);
  }
});

router.put("/jobs/:id", authMiddleware, async (req, res) => {
  const jobId = req.params.id;

  if (!validateJobFields(req.body)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const updatedJob = await updateJob(jobId, req.body);
    if (!updatedJob) {
      return res.status(404).json({ error: "Job not found or update failed" });
    }

    res.status(200).json({ message: "Job updated successfully", job: updatedJob });
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/jobs/:id", authMiddleware, async (req, res) => {
  const jobId = req.params.id;
  try {
    const deleted = await deleteJob(jobId);
    if (!deleted) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.status(200).json({ message: "Job deleted successfully" });
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

function handleError(res, error) {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = router;
