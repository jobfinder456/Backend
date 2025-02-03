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

cron.schedule('0 0 * * *', async () => {
  try {
      // Query to find users with expired subscriptions
      const query = `
          UPDATE jb_users
          SET credits = 0, 
          current_credits = 0
          WHERE sub_expiry <= NOW() AND credits > 0;
      `;
      
      await executeQuery(query);

      console.log("Credits removed for expired subscriptions.");
  } catch (error) {
      console.error("Error removing credits:", error);
  }
});

const updateCredits = async (email, credits, subscriptionId, plan_id) => {
  try {
      // SQL query to update credits, subscription_id, and plan_id
      const query = `
        UPDATE jb_users 
        SET credits = $1, current_credits = $1, sub_id = $2, plan_id = $3, status = $5
        WHERE email = $4
        RETURNING *`;
      
      const values = [credits, subscriptionId, plan_id, email, "active"];

      const result = await executeQuery(query, values); // Execute the query

      // Check if the user exists and was updated
      if (!result || result.length === 0) {
          return null; // No user found with the provided email
      }

      // Return the updated user data
      return result[0];
  } catch (error) {
      console.error("Error in updateCredits function:", error);
      throw error; // Re-throw the error to be caught in the route handler
  }
};

async function getUserCredits(email) {
  try {
    const query = "SELECT credits, current_credits FROM jb_users WHERE email = $1";
    const result = await executeQuery(query, [email]);

    if (!result || result.length === 0) {
      throw new Error("User not found or no credits available.");
    }

    return result[0].current_credits;
  } catch (error) {
    console.error("Error fetching user credits:", error.message);
    throw error; // Re-throw the error for higher-level handling
  }
}

async function updateJobStatus(jobId, isOk) {
  try {
    const query = "UPDATE jb_jobs SET is_ok = $1, last_update = CURRENT_DATE WHERE id = $2";
    await executeQuery(query, [isOk, jobId]);
  } catch (error) {
    console.error("Error updating job status:", error.message);
    throw error;
  }
}

async function deductUserCredits(email) {
  try {
    const query = "UPDATE jb_users SET current_credits = current_credits - 1 WHERE email = $1";
    await executeQuery(query, [email]);
  } catch (error) {
    console.error("Error deducting user credits:", error.message);
    throw error;
  }
}

async function addUserCredits(email) {
  try {
    const query = "UPDATE jb_users SET current_credits = current_credits + 1 WHERE email = $1";
    await executeQuery(query, [email]);
  } catch (error) {
    console.error("Error adding user credits:", error.message);
    throw error;
  }
}

module.exports = {
  getUserCredits,
  updateJobStatus,
  deductUserCredits,
  addUserCredits,
  updateCredits 
};