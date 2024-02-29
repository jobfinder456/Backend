const {Client} = require("pg");

/*async function createUsersTable() {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:JeobHvR8W0SA@ep-nameless-sky-a5r1955s.us-east-2.aws.neon.tech/neondb?sslmode=require"
    });
    await client.connect()
    const result = await client.query(`
        CREATE TABLE AT (
            id SERIAL PRIMARY KEY,
            company_name VARCHAR(30) NOT NULL,
            website VARCHAR(35) NOT NULL,
            job_title VARCHAR(30) NOT NULL,
            work_loc VARCHAR(80) NOT NULL,
            remote BOOLEAN NOT NULL DEFAULT false,
            job_link VARCHAR(50) NOT NULL,
            description VARCHAR(850) NOT NULL
        );
    `)
    console.log(result)
    await client.end();
}
*/
async function getData() {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:JeobHvR8W0SA@ep-nameless-sky-a5r1955s.us-east-2.aws.neon.tech/neondb?sslmode=require"
    });
    
    try {
        await client.connect();
        const query = 'SELECT * FROM AT';
        const result = await client.query(query)
        console.log("rows affected", result.rows);
        return result
    } catch (error) {
        console.error("Error executing query:", error);
    } finally {
        await client.end(); // Close the client connection after the query is executed
    }
}

async function insertData(company_name,website,job_title,work_loc,remote,job_link,description){
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:JeobHvR8W0SA@ep-nameless-sky-a5r1955s.us-east-2.aws.neon.tech/neondb?sslmode=require"
    });
    
    try {
        await client.connect();
        const query = 'INSERT INTO AT (company_name, website, job_title, work_loc, remote, job_link, description) VALUES ($1, $2, $3, $4, $5, $6, $7)';
        const values = [company_name, website, job_title, work_loc, remote, job_link, description];
        const result = await client.query(query, values);
        console.log("rows affected", result.rows);
        return result
    } catch (error) {
        console.error("Error executing query:", error);
    } finally {
        await client.end(); // Close the client connection after the query is executed
    }
}

async function deleteData(id) {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:JeobHvR8W0SA@ep-nameless-sky-a5r1955s.us-east-2.aws.neon.tech/neondb?sslmode=require"
    });
    
    try {
        await client.connect();
        const query = 'DELETE FROM AT WHERE id = $1';
        const value = [id]
        const result = await client.query(query, value);
        console.log("Rows affected:", result.rowCount);
        return result
    } catch (error) {
        console.error("Error executing query:", error);
    } finally {
        await client.end();
    }
}

async function updateData(id, company_name, website, job_title, work_loc, remote, job_link, description) {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:JeobHvR8W0SA@ep-nameless-sky-a5r1955s.us-east-2.aws.neon.tech/neondb?sslmode=require"
    });
    
    try {
        await client.connect();
        const query = `
            UPDATE AT 
            SET company_name = $1, 
                website = $2, 
                job_title = $3, 
                work_loc = $4, 
                remote = $5, 
                job_link = $6, 
                description = $7 
            WHERE id = $8`;
        const values = [company_name, website, job_title, work_loc, remote, job_link, description, id];
        const result = await client.query(query, values);
        console.log("Rows affected:", result.rowCount);
        return result
    } catch (error) {
        console.error("Error executing query:", error);
    } finally {
        await client.end();
    }
}


module.exports = {
    getData,
    insertData,
    deleteData,
    updateData
};