const express = require("express");
const {
  getData,
  insertData,
  updateJob,
  deleteJob,
  getJobById,
  getuserjobData,
  impressiondb,
  getTotalImpressions,
  getAllCompanies,
  getCompanyJobDetails,
  getCompanyDetails,
} = require("../db/job_function");
const { authMiddleware } = require("../auth/middleware");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

router.use(express.json());

// Validate required job fields
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
  } = body;

  return (
    job_title &&
    work_loc &&
    commitment &&
    typeof remote !== "undefined" &&
    job_link &&
    description &&
    categories &&
    level
  );
};

// Centralized error handler
function handleError(res, error, customMessage) {
  console.error(customMessage, error);
  res.status(500).json({ error: customMessage || "Internal server error" });
}

// GET /list - List jobs with pagination and filters
router.get("/list", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const searchParams = {
      searchTerm: req.query.search || "",
      location: req.query.loc || "",
      remote: req.query.remote ? req.query.remote === "true" : undefined,
      categories: req.query.categories || "",
      level: req.query.level || "",
      compensation: req.query.compensation || "",
      commitment: req.query.commitment || "",
    };

    const jobs = await getData(offset, limit, searchParams);
    res.status(200).json({ jobs });
  } catch (error) {
    handleError(res, error, "Failed to retrieve jobs");
  }
});

// GET /jobs/:id - Get job by ID
router.get("/jobs/:id", async (req, res) => {
  const jobId = req.params.id;

  try {
    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const impression = await impressiondb(jobId);
    if (!impression) {
      return res.status(500).json({ error: "Failed to register impression" });
    }

    res.status(200).json(job);
  } catch (error) {
    handleError(res, error, `Failed to retrieve job with ID: ${jobId}`);
  }
});

// POST /insert - Insert a new job
router.post("/insert", authMiddleware, async (req, res) => {
  try {
    if (!validateJobFields(req.body)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const {
      company_profile_id,
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
      email,
    } = req.body;

    const insertedJob = await insertData(
      company_profile_id,
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

    if (!insertedJob) {
      return res.status(500).json({ error: "Failed to insert job" });
    }

    res.status(201).json({ message: "Job inserted successfully", job: insertedJob });
  } catch (error) {
    handleError(res, error, "Error inserting job");
  }
});

// PUT /jobs/:id - Update a job
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
    handleError(res, error, `Failed to update job with ID: ${jobId}`);
  }
});

// DELETE /jobs/:id - Delete a job
router.delete("/jobs/:id", authMiddleware, async (req, res) => {
  const jobId = req.params.id;

  try {
    const deleted = await deleteJob(jobId);
    if (!deleted) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    handleError(res, error, `Failed to delete job with ID: ${jobId}`);
  }
});

// GET /jobs - Get jobs for the authenticated user
router.get("/jobs", authMiddleware, async (req, res) => {
  try {
    const email = req.email;
    const page = parseInt(req.query.page) || 1;

    if (page < 1) {
      return res.status(400).json({ error: "Page number must be 1 or greater" });
    }

    const { jobResult, hasMore, credits } = await getuserjobData(email, page);

    res.status(200).json({
      jobs: jobResult,
      hasMore,
      currentPage: page,
      credits,
    });
  } catch (error) {
    handleError(res, error, "Failed to retrieve jobs");
  }
});

// GET /user/impressions - Get total impressions for the authenticated user
router.get("/user/impressions", authMiddleware, async (req, res) => {
  try {
    const email = req.email;
    const impressionsData = await getTotalImpressions(email);

    res.status(200).json({
      success: true,
      total_impressions: impressionsData.totalImpressions,
      total_jobs: impressionsData.totalJobs,
      jobs_ok_true: impressionsData.jobsOkTrue,
      jobs_ok_false: impressionsData.jobsOkFalse,
      credits: impressionsData.credits,
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch impressions");
  }
});

// GET /companies - Get all companies
router.get("/companies", async (req, res) => {
  try {
    const companies = await getAllCompanies();
    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    handleError(res, error, "Failed to fetch companies");
  }
});

// GET /companies/:company - Get details of a specific company
router.get("/companies/:company", async (req, res) => {
  const { company } = req.params;

  try {
    const companyData = await getCompanyDetails(company);
    if (!companyData) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.status(200).json({ success: true, data: companyData });
  } catch (error) {
    handleError(res, error, "Failed to fetch company details");
  }
});

// GET /companies/info/:company - Get job details for a specific company
router.get("/companies/info/:company", async (req, res) => {
  const { company } = req.params;
  const page = parseInt(req.query.page) || 1;

  if (page < 1) {
    return res.status(400).json({ error: "Page number must be 1 or greater" });
  }

  const searchParams = {
    job_title: req.query.job_title || null,
    location: req.query.location || null,
    remote: req.query.remote || null,
    categories: req.query.categories || null,
    level: req.query.level || null,
    compensation: req.query.compensation || null,
    commitment: req.query.commitment || null,
  };

  try {
    const companyData = await getCompanyJobDetails(company, searchParams, page);
    if (!companyData) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.status(200).json({ success: true, data: companyData });
  } catch (error) {
    handleError(res, error, "Failed to fetch company job details");
  }
});

module.exports = router;