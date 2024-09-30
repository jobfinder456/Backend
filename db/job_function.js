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
    const query = `
      SELECT 
        jb_jobs.*
      FROM jb_users
      JOIN user_profile ON jb_users.id = user_profile.jb_user_id
      JOIN jb_jobs ON user_profile.id = jb_jobs.user_profile_id
      WHERE jb_users.email = $1
    `;

    const jobResult = await executeQuery(query, [email]);

    if (jobResult.length === 0) {
      return { jobResult: [] };
    }

    // Return only the job data
    return { jobResult };
  } catch (error) {
    console.error("Error executing query:", error);
    return { jobResult: [] };
  }
}


async function getData(offset, limit, searchTerm, location, remote) {
  try {
    let query = `
      SELECT 
        JB_JOBS.*, 
        user_profile.company_name, 
        user_profile.website, 
        user_profile.image_url
      FROM JB_JOBS
      JOIN user_profile 
        ON JB_JOBS.user_profile_id = user_profile.id
    `;
    
    let conditions = [`JB_JOBS.is_ok = false`]; 
    let params = [];

    if (searchTerm) {
      conditions.push(`JB_JOBS.job_title ILIKE $${params.length + 1}`);
      params.push(`%${searchTerm}%`);
    }

    if (remote === true) {
      conditions.push(`JB_JOBS.remote = $${params.length + 1}`);
      params.push(remote);
    }

    if (location && remote !== true) {
      conditions.push(`JB_JOBS.work_loc ILIKE $${params.length + 1}`);
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
        JB_JOBS.*,
        user_profile.company_name, 
        user_profile.website, 
        user_profile.image_url
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
        name,
        email
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

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
        user_profile.company_name, 
        user_profile.website, 
        user_profile.image_url
      FROM jb_jobs
      JOIN user_profile ON jb_jobs.user_profile_id = user_profile.id
      WHERE jb_jobs.id = $1
    `;

    const jobDetails = await executeQuery(jobDetailsQuery, [insertedJob[0].id]);

    return jobDetails[0];  
  } catch (error) {
    console.error("Error inserting job data:", error);
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
      jobId
    ]);
    
    if (updatedJob.length > 0) {
      const profileQuery = `
        SELECT 
          user_profile.company_name, 
          user_profile.website, 
          user_profile.image_url
        FROM jb_jobs
        JOIN user_profile ON jb_jobs.user_profile_id = user_profile.id
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

async function insertProfile(email,company_name, website, fileLink) {
  try {
      const findUserQuery = 'SELECT id FROM jb_users WHERE email = $1';
      const userResult = await executeQuery(findUserQuery, [email]);
      if (userResult.length === 0) {
          return { error: "User not found" };
      }
      const userId = userResult[0].id;
      const insertProfileQuery = `
          INSERT INTO user_profile (company_name, website, image_url, jb_user_id)
          VALUES ($1, $2, $3, $4)
          `;
      const values = [company_name, website, fileLink, userId];
      await executeQuery(insertProfileQuery, values);
      return { success: true };
  } catch (err) {
      console.error("Error inserting profile:", err);
      return { error: "Database error" };
  }
}

async function deleteJob(jobId) {
  try {
    const fetchQuery = `
      SELECT 
        jb_jobs.job_title,
        jb_jobs.work_loc,
        user_profile.company_name, 
        user_profile.website, 
        user_profile.image_url
      FROM jb_jobs 
      JOIN user_profile ON jb_jobs.user_profile_id = user_profile.id
      WHERE jb_jobs.id = $1
    `;
    const jobDetails = await executeQuery(fetchQuery, [jobId]);

    if (jobDetails.length === 0) {
      return null; 
    }

    const deleteQuery = `
      DELETE FROM jb_jobs
      WHERE id = $1
      RETURNING *
    `;
     await executeQuery(deleteQuery, [jobId]);

    return jobDetails[0]; 
  } catch (error) {
    console.error("Error deleting job:", error);
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
  insertProfile
};
