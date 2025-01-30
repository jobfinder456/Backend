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
          SET credits = 0
          WHERE sub_expiry <= NOW() AND credits > 0;
      `;
      
      await client.query(query);

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
        SET credits = $1, current_credits = $1, sub_id = $2, plan_id = $3
        WHERE email = $4
        RETURNING *`;
      
      const values = [credits, subscriptionId, plan_id, email];

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
  const query = "SELECT credits, current_credits FROM jb_users WHERE email = $1";
  const result = await executeQuery(query, [email]);
  return result.length > 0 ? result[0].credits : null;
}

async function updateJobStatus(jobId, isOk) {
  const query = "UPDATE jb_jobs SET is_ok = $1, last_update = CURRENT_DATE WHERE id = $2";
  await executeQuery(query, [isOk, jobId]);
}

async function deductUserCredits(email) {
  const query = "UPDATE jb_users SET current_credits = current_credits - 1 WHERE email = $1";
  await executeQuery(query, [email]);
}

async function addUserCredits(email) {
  const query = "UPDATE jb_users SET credits = credits + 1 WHERE email = $1";
  await executeQuery(query, [email]);
}

module.exports = {
  getUserCredits,
  updateJobStatus,
  deductUserCredits,
  addUserCredits,
  updateCredits 
};