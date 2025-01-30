const { Pool } = require("pg");
const cron = require("node-cron");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Helper function for executing queries
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

// Update job status for expired jobs
async function updateJobStatus() {
  const query = `
    UPDATE jb_jobs 
    SET is_ok = false 
    WHERE is_ok = true 
    AND last_update < (CURRENT_DATE - INTERVAL '31 days')
    RETURNING *;
  `;

  try {
    const result = await executeQuery(query);
    return result;
  } catch (error) {
    console.error("Error updating job statuses:", error);
    throw error;
  }
}

// Schedule cron job to update job statuses daily at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    await updateJobStatus();
    console.log("Job statuses updated successfully.");
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});
*/

// Update multiple jobs by their IDs
async function jobUpdate(jobIds) {
  const queryText = `
    UPDATE jb_jobs 
    SET is_ok = TRUE, last_update = CURRENT_DATE 
    WHERE id = $1
  `;

  try {
    for (const jobId of jobIds) {
      await executeQuery(queryText, [jobId]);
    }
  } catch (error) {
    console.error("Error updating job status:", error);
    throw error;
  }
}

// Get user job data with pagination
async function getuserjobData(email, page) {
  const jobsPerPage = 20;
  const offset = (page - 1) * jobsPerPage;

  const query = `
    SELECT 
      jb_jobs.id,
      jb_jobs.job_title, 
      jb_jobs.is_ok, 
      jb_jobs.impressions, 
      jb_jobs.last_update,
      company_profile.company_name AS company_name
    FROM jb_users
    JOIN company_profile ON jb_users.id = company_profile.jb_user_id
    JOIN jb_jobs ON company_profile.id = jb_jobs.company_profile_id
    WHERE jb_users.email = $1
    LIMIT $2 OFFSET $3;
  `;

  try {
    const jobResult = await executeQuery(query, [email, jobsPerPage, offset]);
    const hasMore = jobResult.length === jobsPerPage;

    return { jobResult, hasMore };
  } catch (error) {
    console.error("Error fetching user job data:", error);
    throw error;
  }
}

// Get job data with filters and pagination
async function getData(offset, limit, searchParams) {
  const { searchTerm, location, remote, categories, level, compensation, commitment } = searchParams;

  let query = `
    SELECT 
      jb_jobs.*, 
      company_profile.company_name, 
      company_profile.website, 
      company_profile.image_url
    FROM jb_jobs
    JOIN company_profile ON jb_jobs.company_profile_id = company_profile.id
  `;

  let conditions = [];
  let params = [];

  if (searchTerm) {
    conditions.push(`jb_jobs.job_title ILIKE $${params.length + 1}`);
    params.push(`%${searchTerm}%`);
  }

  if (location) {
    conditions.push(`jb_jobs.work_loc ILIKE $${params.length + 1}`);
    params.push(`%${location}%`);
  }

  if (remote !== undefined) {
    conditions.push(`jb_jobs.remote = $${params.length + 1}`);
    params.push(remote);
  }

  if (categories) {
    conditions.push(`jb_jobs.categories ILIKE $${params.length + 1}`);
    params.push(`%${categories}%`);
  }

  if (level) {
    conditions.push(`jb_jobs.level ILIKE $${params.length + 1}`);
    params.push(`%${level}%`);
  }

  if (compensation) {
    conditions.push(`jb_jobs.compensation = $${params.length + 1}`);
    params.push(compensation);
  }

  if (commitment) {
    conditions.push(`jb_jobs.commitment ILIKE $${params.length + 1}`);
    params.push(`%${commitment}%`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY jb_jobs.last_update DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  try {
    const result = await executeQuery(query, params);
    return result;
  } catch (error) {
    console.error("Error fetching job data:", error);
    throw error;
  }
}

// Get job details by ID
async function getJobById(jobId) {
  const query = `
    SELECT 
      jb_jobs.*,
      company_profile.company_name, 
      company_profile.website, 
      company_profile.image_url
    FROM jb_jobs
    JOIN company_profile ON jb_jobs.company_profile_id = company_profile.id
    WHERE jb_jobs.id = $1
  `;

  try {
    const job = await executeQuery(query, [jobId]);
    return job[0] || null;
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    throw error;
  }
}

// Insert a new job
async function insertData(jobData) {
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
  } = jobData;

  const insertJobQuery = `
    INSERT INTO jb_jobs (
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
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const insertJobValues = [
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
  ];

  try {
    const insertedJob = await executeQuery(insertJobQuery, insertJobValues);
    return insertedJob[0] || null;
  } catch (error) {
    console.error("Error inserting job data:", error);
    throw error;
  }
}

// Update job impressions
async function impressiondb(jobId) {
  const query = `
    UPDATE jb_jobs 
    SET impressions = impressions + 1 
    WHERE id = $1
  `;

  try {
    await executeQuery(query, [jobId]);
  } catch (error) {
    console.error("Error updating job impressions:", error);
    throw error;
  }
}

// Update job details
async function updateJob(jobId, jobData) {
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
    company_profile_id,
    name,
    email,
  } = jobData;

  const query = `
    UPDATE jb_jobs
    SET 
      job_title = $1,
      work_loc = $2,
      commitment = $3,
      remote = $4,
      job_link = $5,
      description = $6,
      categories = $7,
      level = $8,
      compensation = $9,
      name = $10,
      email = $11,
      company_profile_id = $12
    WHERE id = $13
    RETURNING *
  `;

  const values = [
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
    company_profile_id,
    jobId,
  ];

  try {
    const updatedJob = await executeQuery(query, values);
    return updatedJob[0] || null;
  } catch (error) {
    console.error("Error updating job:", error);
    throw error;
  }
}

// Delete a job
async function deleteJob(jobId) {
  const query = `
    DELETE FROM jb_jobs 
    WHERE id = $1 
    RETURNING *
  `;

  try {
    const deletedJob = await executeQuery(query, [jobId]);
    return deletedJob[0] || null;
  } catch (error) {
    console.error("Error deleting job:", error);
    throw error;
  }
}

// Get total impressions for a user
async function getTotalImpressions(email) {
  const query = `
    SELECT 
      COUNT(j.id) AS total_jobs,
      SUM(j.impressions) AS total_impressions,
      COUNT(CASE WHEN j.is_ok = TRUE THEN 1 END) AS jobs_ok_true,
      COUNT(CASE WHEN j.is_ok = FALSE THEN 1 END) AS jobs_ok_false,
      u.credits
    FROM jb_users u
    JOIN company_profile cp ON u.id = cp.jb_user_id
    JOIN jb_jobs j ON cp.id = j.company_profile_id
    WHERE u.email = $1
    GROUP BY u.id
  `;

  try {
    const result = await executeQuery(query, [email]);
    return result[0] || {
      totalJobs: 0,
      totalImpressions: 0,
      jobsOkTrue: 0,
      jobsOkFalse: 0,
      credits: 0,
    };
  } catch (error) {
    console.error("Error fetching total impressions:", error);
    throw error;
  }
}

async function insertProfile(email,company_name, website, fileLink) {
  try {
      const findUserQuery = 'SELECT id FROM jb_users WHERE email = $1';
      const userResult = await executeQuery(findUserQuery, [email]);
      if (userResult.length === 0) {
          return { error: "User not found" };
      }
      const userId = userResult[0].id;
      const insertProfileQuery = `
          INSERT INTO company_profile (company_name, website, image_url, jb_user_id)
          VALUES ($1, $2, $3, $4)
          `;
      const values = [company_name, website, fileLink, userId];
      await executeQuery(insertProfileQuery, values);
      return { success: true };
  } catch (err) {
      console.error("Error inserting profile", err);
      return { error: err.message };
  }
}

async function getJobImpressions(jobId) {
  const query = `
    SELECT 
        impressions
    FROM 
        jb_jobs
    WHERE 
        id = $1
  `;

  try {
    const result = await executeQuery(query, [jobId]);

    const rows = Array.isArray(result) ? result : result?.rows;

    if (rows && rows.length > 0) {
      const impressions = rows[0].impressions; 
      return impressions;
    } else {
      return 0;
    }
  } catch (error) {
    console.error("Error in getJobImpressions:", error);
    throw new Error("Database query failed");
  }
}

// Insert a new resume
async function insertResume(name, email, fileLink, position) {
  const checkQuery = `
    SELECT email 
    FROM user_details 
    WHERE email = $1
  `;

  const insertQuery = `
    INSERT INTO user_details (name, email, s3_resume_url, position)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  try {
    const checkResult = await executeQuery(checkQuery, [email]);
    if (checkResult.length > 0) {
      return { success: false, error: "Email already exists." };
    }

    const insertResult = await executeQuery(insertQuery, [name, email, fileLink, position]);
    return { success: true, data: insertResult[0] };
  } catch (error) {
    console.error("Error inserting resume:", error);
    throw error;
  }
}

// Get all companies
async function getAllCompanies() {
  const query = `
    SELECT 
      cp.company_name, 
      cp.image_url, 
      COUNT(jj.id) AS total_jobs
    FROM company_profile cp
    LEFT JOIN jb_jobs jj ON cp.id = jj.company_profile_id
    GROUP BY cp.id, cp.company_name, cp.image_url
  `;

  try {
    const result = await executeQuery(query);
    return result;
  } catch (error) {
    console.error("Error fetching all companies:", error);
    throw error;
  }
}

// Get company details
async function getCompanyDetails(company) {
  const query = `
    SELECT 
      cp.*, 
      COUNT(jj.id) AS total_jobs
    FROM company_profile cp
    LEFT JOIN jb_jobs jj ON cp.id = jj.company_profile_id
    WHERE LOWER(REPLACE(cp.company_name, ' ', '')) ILIKE LOWER(REPLACE($1, ' ', ''))
    GROUP BY cp.id
  `;

  try {
    const result = await executeQuery(query, [company]);
    return result[0] || null;
  } catch (error) {
    console.error("Error fetching company details:", error);
    throw error;
  }
}

// Get company job details
async function getCompanyJobDetails(company, searchParams, page) {
  const jobsPerPage = 20;
  const offset = (page - 1) * jobsPerPage;

  const query = `
    SELECT 
      jb_jobs.*,
      company_profile.image_url
    FROM jb_jobs
    JOIN company_profile ON jb_jobs.company_profile_id = company_profile.id
    WHERE LOWER(REPLACE(company_profile.company_name, ' ', '')) ILIKE LOWER(REPLACE($1, ' ', ''))
    LIMIT $2 OFFSET $3
  `;

  try {
    const result = await executeQuery(query, [company, jobsPerPage, offset]);
    return { jobs: result };
  } catch (error) {
    console.error("Error fetching company job details:", error);
    throw error;
  }
}

module.exports = {
  jobUpdate,
  getuserjobData,
  getData,
  getJobById,
  insertData,
  updateJob,
  deleteJob,
  insertProfile,
  impressiondb,
  getTotalImpressions,
  getJobImpressions,
  insertResume,
  getAllCompanies,
  getCompanyJobDetails,
  getCompanyDetails,
};