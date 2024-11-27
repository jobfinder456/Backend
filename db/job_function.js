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

async function executeQuery(query, values = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

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
    return null;
  }
}

cron.schedule("0 0 * * *", async () => {
  await updateJobStatus();
});

async function jobUpdate(jobIds) {
  const queryText =
    "UPDATE jb_jobs SET is_ok = TRUE, last_update = CURRENT_DATE WHERE id = $1";
  try {
    for (const jobId of jobIds) {
      const queryParams = [jobId];
      await executeQuery(queryText, queryParams);
    }
  } catch (error) {
    console.error("Error updating job status:", error);
  }
}

async function getuserjobData(email, page) {
  try {
    const jobsPerPage = 20; // Number of jobs to send per request
    const offset = (page - 1) * jobsPerPage; // Calculate the offset based on the page number

    const query = `
      SELECT 
        jb_jobs.*,
        company_profile.company_name AS company_name
      FROM jb_users
      JOIN company_profile ON jb_users.id = company_profile.jb_user_id
      JOIN jb_jobs ON company_profile.id = jb_jobs.company_profile_id
      WHERE jb_users.email = $1
      LIMIT $2 OFFSET $3
    `;

    const jobResult = await executeQuery(query, [email, jobsPerPage, offset]);

    if (jobResult.length === 0) {
      return { jobResult: [], hasMore: false }; // Indicate no more jobs available
    }

    return { jobResult, hasMore: jobResult.length === jobsPerPage }; // Indicate if more jobs are available
  } catch (error) {
    console.error("Error executing query:", error);
    return { jobResult: [], hasMore: false };
  }
}


async function getData(offset, limit, searchTerm, location, remote, categories, level, compensation, commitment) {
  try {
    let query = `
      SELECT 
        JB_JOBS.*, 
        company_profile.company_name, 
        company_profile.website, 
        company_profile.image_url
      FROM JB_JOBS
      JOIN company_profile 
        ON JB_JOBS.company_profile_id = company_profile.id
    `;

    let conditions = []; 
    let params = [];

    if (searchTerm) {
      conditions.push(`JB_JOBS.job_title ILIKE $${params.length + 1}`);
      params.push(`%${searchTerm}%`); 
    }

    if (remote === true) {
      if (location) {
        conditions.push(`JB_JOBS.remote = true AND JB_JOBS.work_loc ILIKE $${params.length + 1}`);
        params.push(`%${location}%`);
      } else {
        conditions.push(`JB_JOBS.remote = $${params.length + 1}`);
        params.push(remote);
      }
    } else if (location) {
      conditions.push(`JB_JOBS.work_loc ILIKE $${params.length + 1}`);
      params.push(`%${location}%`);
    }

    if (categories) {
      conditions.push(`JB_JOBS.categories ILIKE $${params.length + 1}`);
      params.push(`%${categories}%`);
    }

    if (level) {
      conditions.push(`JB_JOBS.level ILIKE $${params.length + 1}`);
      params.push(`%${level}%`);
    }

    if (compensation) {
      conditions.push(`JB_JOBS.compensation = $${params.length + 1}`);
      params.push(compensation);
    }

    if (commitment) {
      conditions.push(`JB_JOBS.commitment ILIKE $${params.length + 1}`);
      params.push(`%${commitment}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    // Order by the latest updates
    query += ` ORDER BY JB_JOBS.last_update DESC`;

    // Pagination
    query += ` OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    params.push(offset, limit);

    const result = await executeQuery(query, params);
    return result;
  } catch (error) {
    console.error("Error executing query:", error);
    return [];
  }
}


async function getJobById(jobId) {
  try {
    const query = `
      SELECT 
        JB_JOBS.*,
        company_profile.company_name, 
        company_profile.website, 
        company_profile.image_url
      FROM jb_jobs 
      JOIN company_profile ON jb_jobs.company_profile_id = company_profile.id 
      WHERE jb_jobs.id = $1
    `;
    const job = await executeQuery(query, [jobId]);
    return job[0]; 
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    return null;
  }
}

async function insertData(
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
) {
  try {
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
      email
    ];

    const insertedJob = await executeQuery(insertJobQuery, insertJobValues);

    if (insertedJob.length === 0) {
      return null;
    }

    const jobDetailsQuery = `
      SELECT 
        jb_jobs.*,
        company_profile.company_name, 
        company_profile.website, 
        company_profile.image_url
      FROM jb_jobs
      JOIN company_profile ON jb_jobs.company_profile_id = company_profile.id
      WHERE jb_jobs.id = $1
    `;

    const jobDetails = await executeQuery(jobDetailsQuery, [insertedJob[0].id]);
    return jobDetails[0];  
  } catch (error) {
    console.error("Error inserting job data:", error);
    return null;
  }
}

async function impressiondb(jobId) {
  const query = 'UPDATE jb_jobs SET impressions = impressions + 1 WHERE id = $1 ';
  const addimp = await executeQuery(query, [jobId])
  return addimp
}

async function updateJob(jobId, jobData) {
  const { job_title, work_loc, commitment, remote, job_link, description, categories, level, compensation, company_profile_id, name, email } = jobData;
  try {
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
    
    const updatedJob = await executeQuery(query, [
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
      jobId
    ]);
    
    if (updatedJob.length > 0) {
      const profileQuery = `
        SELECT 
          company_profile.company_name, 
          company_profile.website, 
          company_profile.image_url
        FROM jb_jobs
        JOIN company_profile ON jb_jobs.company_profile_id = company_profile.id
        WHERE jb_jobs.id = $1
      `;
      
      const profileDetails = await executeQuery(profileQuery, [jobId]);
      
      return {
        ...updatedJob[0],
        ...profileDetails[0] 
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error updating job:", error);
    return null;
  }
}

async function deleteJob(jobId) {
  try {
    const query = `
      DELETE FROM jb_jobs 
      WHERE id = $1 
      RETURNING *;
    `;
    const deletedJob = await executeQuery(query, [jobId]);
    
    if (deletedJob.length === 0) {
      return null;
    }
    
    return deletedJob[0]; 
  } catch (error) {
    console.error("Error deleting job:", error);
    return null;
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

    // Check if result is an array or has a rows property
    const rows = Array.isArray(result) ? result : result?.rows;

    console.log("Query rows:", rows);

    // Ensure rows exist and fetch impressions
    if (rows && rows.length > 0) {
      const impressions = rows[0].impressions; // Access the first row
      console.log("Impressions found:", impressions);
      return impressions;
    } else {
      console.log("No rows found, returning 0.");
      return 0;
    }
  } catch (error) {
    console.error("Error in getJobImpressions:", error);
    throw new Error("Database query failed");
  }
}

async function getTotalImpressions(email) {
  try {
    // Step 1: Fetch user ID based on the provided email
    const userQuery = `
      SELECT id 
      FROM jb_users 
      WHERE email = $1
    `;
    const userResult = await executeQuery(userQuery, [email]);

    // Extract user ID from the query result
    const userRows = Array.isArray(userResult) ? userResult : userResult?.rows;
    if (!userRows || userRows.length === 0) {
      console.log("No user found with the provided email.");
      return {
        totalJobs: 0,
        totalImpressions: 0,
        jobsOkTrue: 0,
        jobsOkFalse: 0,
      };
    }
    const userId = userRows[0]?.id;

    // Step 2: Fetch job stats using the user ID
    const jobStatsQuery = `
      SELECT 
          COUNT(j.id) AS total_jobs,                           -- Total number of jobs
          SUM(j.impressions) AS total_impressions,            -- Total impressions count
          COUNT(CASE WHEN j.is_ok = TRUE THEN 1 END) AS jobs_ok_true, -- Total jobs with is_ok = true
          COUNT(CASE WHEN j.is_ok = FALSE THEN 1 END) AS jobs_ok_false -- Total jobs with is_ok = false
      FROM 
          jb_users u
      JOIN 
          company_profile cp ON u.id = cp.jb_user_id
      JOIN 
          jb_jobs j ON cp.id = j.company_profile_id
      WHERE 
          u.id = $1
    `;
    const jobStatsResult = await executeQuery(jobStatsQuery, [userId]);

    // Check if result is an array or has a rows property
    const rows = Array.isArray(jobStatsResult) ? jobStatsResult : jobStatsResult?.rows;

    console.log("Query rows:", rows);

    if (rows && rows.length > 0) {
      const {
        total_jobs = 0,
        total_impressions = 0,
        jobs_ok_true = 0,
        jobs_ok_false = 0,
      } = rows[0];

      console.log("Job stats:", {
        total_jobs,
        total_impressions,
        jobs_ok_true,
        jobs_ok_false,
      });

      return {
        totalJobs: total_jobs,
        totalImpressions: total_impressions,
        jobsOkTrue: jobs_ok_true,
        jobsOkFalse: jobs_ok_false,
      };
    } else {
      console.log("No rows found, returning defaults.");
      return {
        totalJobs: 0,
        totalImpressions: 0,
        jobsOkTrue: 0,
        jobsOkFalse: 0,
      };
    }
  } catch (error) {
    console.error("Error in getTotalImpressions:", error);
    throw new Error("Database query failed");
  }
}



async function insertResume(name, email, fileLink, position) {
  try {

    const query = `
      INSERT INTO user_details (name, email, s3_resume_url, position)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [name, email, fileLink, position];

    const result = await pool.query(query, values);

    return {
      success: true,
      data: result.rows[0], 
    };
  } catch (error) {
    console.error("Error inserting resume into database:", error);

    return {
      success: false,
      error: "Failed to insert data into the database.",
    };
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

async function getAllCompanies() {
  const query = `
    SELECT 
      company_name, 
      image_url 
    FROM company_profile;
  `;

  try {
    const result = await executeQuery(query);
    console.log(result)
    return result; // Returns an array of company objects
  } catch (error) {
    console.error("Error fetching all companies:", error);
    throw error; 
  }
}

async function getCompanyDetails(company, searchParams, page = 1) {
  const jobsPerPage = 20;
  const offset = (page - 1) * jobsPerPage;

  const getCompanyIdQuery = `
    SELECT id 
FROM company_profile 
WHERE LOWER(REPLACE(company_name, ' ', '')) ILIKE LOWER(REPLACE($1, ' ', ''));

  `;

  let getJobsQuery = `
    SELECT id,
      company_profile_id,
      job_title,
      work_loc,
      commitment,
      remote,
      job_link,
      description,
      is_ok,
      categories,
      level,
      compensation
    FROM jb_jobs 
    WHERE company_profile_id = $1
  `;

  // Query parameters
  const queryParams = [];
  let paramIndex = 2; // Start at 2 since companyId will be $1

  // Add dynamic filters
  if (searchParams.job_title) {
    getJobsQuery += ` AND job_title ILIKE $${paramIndex}`;
    queryParams.push(`%${searchParams.job_title}%`);
    paramIndex++;
  }
  if (searchParams.location) {
    getJobsQuery += ` AND work_loc ILIKE $${paramIndex}`;
    queryParams.push(`%${searchParams.location}%`);
    paramIndex++;
  }
  if (searchParams.remote !== undefined) {
    getJobsQuery += ` AND remote = $${paramIndex}`;
    queryParams.push(searchParams.remote === "true"); // Convert "true"/"false" to boolean
    paramIndex++;
  }
  if (searchParams.commitment) {
    getJobsQuery += ` AND commitment ILIKE $${paramIndex}`;
    queryParams.push(`%${searchParams.commitment}%`);
    paramIndex++;
  }

  // Add pagination
  getJobsQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  queryParams.push(jobsPerPage, offset);

  try {
    // Step 1: Get the company ID
    const companyResult = await executeQuery(getCompanyIdQuery, [company]);
    if (companyResult.length === 0) {
      return null; // No company found
    }
    const companyId = companyResult[0].id;

    // Step 2: Execute job query
    console.log("Query:", getJobsQuery);
    console.log("Parameters:", [companyId, ...queryParams]);

    const jobsResult = await executeQuery(getJobsQuery, [companyId, ...queryParams]);

    return {
      company_name: company,
      jobs: jobsResult,
    };
  } catch (error) {
    console.error("Error fetching company details:", error);
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
  getCompanyDetails
};