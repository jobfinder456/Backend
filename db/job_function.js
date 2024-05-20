const { Pool } = require('pg');
require('dotenv').config();

// Reusable database connection pool
const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING
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

async function insertMail(email) {
    const client = await pool.connect();
    try {
        const query = 'INSERT INTO USER_MAIL (email) VALUES ($1) RETURNING *';
        const values = [email];
        const result = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}

async function getuserjobData(email) {
    try {
        const query = 'SELECT id FROM JB_USERS WHERE email = $1';
        const userResult = await executeQuery(query, [email]);

        if (userResult.length === 0) {
            return [];
        }

        const userId = userResult[0].id;

        const jobQuery = 'SELECT * FROM JB_JOBS WHERE user_id = $1';
        const jobResult = await executeQuery(jobQuery, [userId]);

        const notOkJobsQuery = 'SELECT COUNT(*) AS count FROM JB_JOBS WHERE user_id = $1 AND is_ok = false';
        const notOkJobsResult = await executeQuery(notOkJobsQuery, [userId]);

        const numOfJobNotLive = notOkJobsResult[0].count;

        const result = {
            jobResult: jobResult,
            is_ok: numOfJobNotLive
        };

        return result;
    } catch (error) {
        console.error("Error executing query:", error);
        return [];
    }
}

async function getData(offset, limit, searchTerm, location) {
    try {
        let query = `SELECT * FROM JB_JOBS`;

        if (searchTerm && location) {
            query += ` WHERE (job_title ILIKE '%${searchTerm}%') AND work_loc ILIKE '%${location}%'`;
        } else if (searchTerm) {
            query += ` WHERE job_title ILIKE '%${searchTerm}%'`;
        } else if (location) {
            query += ` WHERE work_loc ILIKE '%${location}%'`;
        }

        query += ` OFFSET $1 LIMIT $2`;
        
        const result = await executeQuery(query, [offset, limit]);
        return result;
    } catch (error) {
        console.error("Error executing query:", error);
        return [];
    }
}

async function getJobData(id) {
    try {
        const query = 'SELECT * FROM JB_JOBS WHERE id = $1';
        const result = await executeQuery(query, [id]);
        return result;
    } catch (error) {
        console.error("Error executing query:", error);
        return [];
    }
}

async function insertData(company_name, website, logo_url, job_title, work_loc, commitment, remote, job_link, description, name, email) {
    try {
        console.log("vdg")
        const checkUserQuery = 'SELECT id FROM JB_USERS WHERE email = $1';
        const checkUserValues = [email];
        const existingUsers = await executeQuery(checkUserQuery, checkUserValues);

        let userId;

        if (existingUsers.length === 0) {
            const insertUserQuery = 'INSERT INTO JB_USERS (name, email) VALUES ($1, $2) RETURNING id';
            const insertUserValues = [name, email];
            const insertedUser = await executeQuery(insertUserQuery, insertUserValues);
            userId = insertedUser[0].id;
        } else {
            userId = existingUsers[0].id;
        }

        const insertJobQuery = 'INSERT INTO JB_JOBS (user_id, company_name, website, logo_url, job_title, work_loc, commitment, remote, job_link, description, name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *';
        const insertJobValues = [userId, company_name, website, logo_url, job_title, work_loc, commitment, remote, job_link, description, name];
        const insertedJob = await executeQuery(insertJobQuery, insertJobValues);

        return insertedJob[0];

    } catch (error) {
        console.error("Error executing query:", error);
        return [];
    }
}

async function deleteData(id) {
    try {
        const query = 'DELETE FROM JB_JOBS WHERE id = $1 RETURNING *';
        const result = await executeQuery(query, [id]);
        return result[0];
    } catch (error) {
        console.error("Error executing query:", error);
        return [];
    }
}

async function updateData(id, company_name, website, job_title, work_loc, commitment, remote, job_link, description) {
    try {
        const query = `
            UPDATE JB_JOBS 
            SET company_name = $1, 
                website = $2, 
                job_title = $3, 
                work_loc = $4,
                commitment = $5, 
                remote = $6, 
                job_link = $7, 
                description = $8 
            WHERE id = $9 RETURNING *`;
        const values = [company_name, website, job_title, work_loc, commitment, remote, job_link, description, id];
        const result = await executeQuery(query, values);
        return result[0];
    } catch (error) {
        console.error("Error executing query:", error);
        return [];
    }
}

module.exports = {
    getData,
    insertData,
    deleteData,
    updateData,
    getJobData,
    getuserjobData,
    insertMail
};
