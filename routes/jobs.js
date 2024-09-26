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
const { authMiddleware } = require("../middleware");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

router.use(express.json());

// Helper function to validate required fields
const validateJobFields = (body) => {
  const {
    job_title,
    work_loc,
    commitment,
    remote,
    job_link,
    description,
    categories,
    level,
    compensation,
  } = body;

  if (
    !job_title ||
    !work_loc ||
    !commitment ||
    typeof remote === "undefined" ||  // Ensure remote is boolean or defined
    !job_link ||
    !description ||
    !categories ||
    !level ||
    !compensation
  ) {
    return false;
  }
  return true;
};

// Route to get all jobs with filters
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

// Get a job by ID
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

// Insert a new job
router.post("/insert", async (req, res) => {
  try {
    const {
      job_title,
      work_loc,
      commitment,
      remote,
      job_link,
      description,
      email,
      categories,
      level,
      compensation,
    } = req.body;

    // Validate required fields
    if (!validateJobFields(req.body)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if the profile exists for the given email
    const profile = await getUserProfileByEmail(email);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    await insertData(
      profile.id,
      job_title,
      work_loc,
      commitment,
      remote,
      job_link,
      description,
      categories,
      level,
      compensation
    );
    res.status(201).json({ message: "Job inserted successfully" });
  } catch (error) {
    handleError(res, error);
  }
});

// Update an existing job by ID
router.put("/jobs/:id", async (req, res) => {
  const jobId = req.params.id;

  // Validate required fields for update
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

// Delete a job by ID
router.delete("/jobs/:id", async (req, res) => {
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

// Route to get jobs for a specific user (based on email)
router.post("/users-list", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const all = await getuserjobData(email);
    res.status(200).json({ all });
  } catch (error) {
    handleError(res, error);
  }
});

// Error handling middleware
function handleError(res, error) {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = router;
