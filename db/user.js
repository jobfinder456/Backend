// login , sigup, verifytoken
const {Client} = require('pg');

async function getUserLogin(email, password) {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
    });
    try {
        await client.connect();
        const query = `SELECT * FROM JB_USER WHERE user_id = $1 AND password = $2`;
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

async function getUserSignUp(email, password) {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
    });
    try {
        await client.connect()

        const query = `SELECT * FROM JB_USERS WHERE user_id = $1 AND password = $2`
        const value = [email, password]

        const result = await client.query(query, value)

        if(!result) {
            const query = `INSERT INTO JB_USERS (email, password) VALUES ($1, $2)`
            const value = [email, password]

            const result = await client.query(query, value)
            return result
        }

        return false

    } catch (error) {
        console.error("Error executing query:", error);
        return false; // Return false in case of error
    }
}

module.exports = {
    getUserLogin
}