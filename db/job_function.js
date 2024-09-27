const { Pool } = require("pg");
const cron = require("node-cron");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
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

async function getuserjobData(email) {
  try {
    const query = "SELECT id FROM JB_USERS WHERE email = $1";
    const userResult = await executeQuery(query, [email]);

    if (userResult.length === 0) {
      return [];
    }

    const userId = userResult[0].id;

    const jobQuery = "SELECT * FROM JB_JOBS WHERE user_id = $1";
    const jobResult = await executeQuery(jobQuery, [userId]);

    const notOkJobsQuery =
      "SELECT COUNT(*) AS count FROM JB_JOBS WHERE user_id = $1 AND is_ok = false";
    const notOkJobsResult = await executeQuery(notOkJobsQuery, [userId]);

    const numOfJobNotLive = notOkJobsResult[0].count;

    const result = {
      jobResult: jobResult,
      is_ok: numOfJobNotLive,
    };

    return result;
  } catch (error) {
    console.error("Error executing query:", error);
    return [];
  }
}

async function getData(offset, limit, searchTerm, location, remote) {
  try {
    let query = `SELECT * FROM JB_JOBS`;
    let conditions = [`is_ok = true`]; 
    let params = [];

    if (searchTerm) {
      conditions.push(`job_title ILIKE $${params.length + 1}`);
      params.push(`%${searchTerm}%`);
    }

    if (remote === true) {
      conditions.push(`remote = $${params.length + 1}`);
      params.push(remote);
    }

    if (location && remote !== true) {
      conditions.push(`work_loc ILIKE $${params.length + 1}`);
      params.push(`%${location}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

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
        jb_jobs.job_title,
        jb_jobs.work_loc,
        jb_jobs.commitment,
        jb_jobs.remote,
        jb_jobs.job_link,
        jb_jobs.description,
        jb_jobs.categories,
        jb_jobs.level,
        jb_jobs.compensation
        user_profile.email 
      FROM jb_jobs 
      JOIN user_profile ON jb_jobs.user_profile_id = user_profile.id 
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
  user_profile_id,
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
) {
  try {
    const insertJobQuery = `
      INSERT INTO jb_jobs (
        user_profile_id, 
        job_title, 
        work_loc, 
        commitment, 
        remote, 
        job_link, 
        description,
        categories,
        level,
        compensation,
        company_name,
        website,
        s3_url,
        name,
        email
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING *`;
    
    const insertJobValues = [
      user_profile_id,
      job_title,
      work_loc,
      commitment,
      remote,
      job_link,
      description,
      categories,
      level,
      compensation,
      company_name,
      website,
      s3_url,
      name,
      email
    ];

    const insertedJob = await executeQuery(insertJobQuery, insertJobValues);
    return insertedJob[0]; 
  } catch (error) {
    console.error("Error inserting job data:", error);
    return []; 
  }
}


async function deleteJob(jobId) {
  try {
    const query = `DELETE FROM jb_jobs WHERE id = $1 RETURNING *`;
    const deletedJob = await executeQuery(query, [jobId]);
    return deletedJob[0];
  } catch (error) {
    console.error("Error deleting job:", error);
    return null;
  }
}

async function updateJob(jobId, jobData) {
  const { job_title, work_loc, commitment, remote, job_link, description, categories, level, compensation } = jobData;
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
        compensation = $9
      WHERE id = $10
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
      jobId,
    ]);
    return updatedJob[0];
  } catch (error) {
    console.error("Error updating job:", error);
    return null;
  }
}

async function insertProfile(company_name, website, name, email, signedUrl) {
  try {
      const findUserQuery = 'SELECT id FROM jb_users WHERE email = $1';
      const userResult = await executeQuery(findUserQuery, [email]);

      if (userResult.length === 0) {
          return { error: "User not found" };
      }

      const userId = userResult[0].id;

      const insertProfileQuery = `
          INSERT INTO user_profile (company_name, website, name, email, image_url, jb_user_id)
          VALUES ($1, $2, $3, $4, $5, $6)
      `;
      const values = [company_name, website, name, email, signedUrl, userId];
      await executeQuery(insertProfileQuery, values);

      return { success: true };
  } catch (err) {
      console.error("Error inserting profile:", err);
      return { error: "Database error" };
  }
}

async function getUserProfileByEmail(email) {
  try {
    const query = "SELECT id FROM user_profile WHERE email = $1";
    const result = await executeQuery(query, [email]);
    return result[0]; 
  } catch (error) {
    console.error("Error fetching profile by email:", error);
    return null;
  }
}

module.exports = {
  jobUpdate,
  getData,
  insertData,
  deleteJob,
  updateJob,
  getJobById,
  getuserjobData,
  executeQuery,
  insertProfile,
  getUserProfileByEmail
};
