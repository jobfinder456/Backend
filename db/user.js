// login , sigup, verifytoken
const { Client } = require("pg");

async function getUserLogin(email) {
  const client = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
  });
  try {
    await client.connect();
    const query = `SELECT * FROM JB_USERs WHERE email = $1 `;
    const value = [email];
    const result = await client.query(query, value);

    if (!result || result.rows.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error executing query:", error);
    return false; 
  } finally {
    await client.end();
  }
}

async function getUserSignUp(name, email) {
  const client = new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
  });
  try {
    await client.connect();
    const query = `SELECT * FROM JB_USERS WHERE email = $1`;
    const value = [email];
    const result = await client.query(query, value);

    if (result.rows.length > 0) {
      return false; 
    }

    const insertQuery = `INSERT INTO JB_USERS (name, email) VALUES ($1, $2)`;
    const insertValues = [name, email];
    await client.query(insertQuery, insertValues);

    return true; 
  } catch (error) {
    console.error("Error executing query:", error);
    return false; 
  } finally {
    await client.end();
  }
}

module.exports = {
  getUserLogin,
  getUserSignUp,
};
