// login , sigup, verifytoken
const {Client} = require('pg');

async function getUserLogin(email, password) {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
    });
    try {
        await client.connect();
        const query = `SELECT * FROM JB_USERs WHERE email = $1 AND password = $2`;
        const value = [email, password];
        const result = await client.query(query, value);

        if (!result || result.rows.length === 0) {
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error executing query:", error);
        return false; // Return false in case of error
    } finally {
        await client.end();
    }
}

async function getUserSignUp(name, email, password) {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
    });
    try {
        await client.connect();
        const query = `SELECT * FROM JB_USERS WHERE email = $1`;
        const value = [email];
        const result = await client.query(query, value);

        if (result.rows.length > 0) {
            
            return false; // User already exists
        }
        
        const insertQuery = `INSERT INTO JB_USERS (name, email, password) VALUES ($1, $2, $3)`;
        const insertValues = [name, email, password];
        await client.query(insertQuery, insertValues);
      
        return true; // User signed up successfully
    } catch (error) {
        console.error("Error executing query:", error);
        return false; // Return false in case of error
    } finally {
        await client.end();
    }
}

module.exports = {
    getUserLogin,
    getUserSignUp
}