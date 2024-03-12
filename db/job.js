const { Client } = require("pg");
const aws = require('aws-sdk');
/*
async function createUsersTable() {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
    });
    await client.connect()
    const result = await client.query(`
        CREATE TABLE JB_USERS (
           id SERIAL PRIMARY KEY,
           name VARCHAR(35) NOT NULL,
           email VARCHAR(60) NOT NULL
        );
    `)
    console.log(result)
    await client.end();
}

async function createjobsTable() {
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
    });
    await client.connect()
    const result = await client.query(`
    CREATE TABLE JB_JOBS (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES JB_USERS(id),
        company_name VARCHAR(30) NOT NULL,
        website VARCHAR(35) NOT NULL,
        logo_url VARCHAR(100) NOT NULL,
        job_title VARCHAR(30) NOT NULL,
        work_loc VARCHAR(80) NOT NULL,
        commitment VARCHAR(20) NOT NULL,
        remote BOOLEAN NOT NULL DEFAULT false,
        job_link VARCHAR(50) NOT NULL,
        description VARCHAR(850) NOT NULL,
        is_ok BOOLEAN NOT NULL DEFAULT false
    );
    
    `)
    console.log(result)
    await client.end();
} 
*/
// Configure AWS credentials and region
async function getuserjobData(email) {
  const client = new Client({
      connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
  });
  
  try {
      await client.connect();

      // Log the email for debugging
      console.log('Email:', email);

      // Query to get the user's ID based on the provided email
      const userQuery = 'SELECT id FROM JB_USERS WHERE email = $1';
      const userResult = await client.query(userQuery, [email]);

      if (userResult.rows.length === 0) {
          console.log("User with email", email, "not found");
          return []; // Return empty array if user not found
      }

      const userId = userResult.rows[0].id;

      // Log the user ID for debugging
      console.log('User ID:', userId);

      // Query to fetch jobs associated with the user's ID
      const jobQuery = 'SELECT * FROM JB_JOBS WHERE user_id = $1';
      const jobResult = await client.query(jobQuery, [userId]);

      console.log("Jobs fetched for user with email", email, ":", jobResult.rows);
      return jobResult.rows;
  } catch (error) {
      console.error("Error executing query:", error);
      return []; // Return empty array in case of error
  } finally {
      await client.end();
  }
}


async function getData() {
  const client = new Client({
      connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
  });
  
  try {
      await client.connect();
      const query = 'SELECT * FROM JB_JOBS';
      const result = await client.query(query)
      console.log("rows affected", result.rows);
      return result
  } catch (error) {
      console.error("Error executing query:", error);
  } finally {
      await client.end(); // Close the client connection after the query is executed
  }
}

async function getJobData(id) {
  const client = new Client({
      connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
  })

  try {
      await client.connect()
      const query = `SELECT * FROM JB_JOBS WHERE id = $1`;
      const value = [id] 
      const result = await client.query(query, value)
      console.log("job found", result.rows)
      return result
  } catch (error) {
      console.error("Error executing query:", error);
  } finally {
      await client.end()
  }
}
 

async function deleteData(id) {
  const client = new Client({
      connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
  });
  
  try {
      await client.connect();
      const query = 'DELETE FROM JB_JOBS WHERE id = $1';
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

async function updateData(id, company_name, website, job_title, work_loc, commitment, remote, job_link, description) {
  const client = new Client({
      connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
  });
  
  try {
      console.log("1")
      await client.connect();
      console.log("2")
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
          WHERE id = $9`;
      const values = [company_name, website, job_title, work_loc, commitment, remote, job_link, description, id];
      const result = await client.query(query, values);
      console.log("3")
      console.log("Rows affected:", result.rowCount);
      return result
  } catch (error) {
      console.error("Error executing query:", error);
  } finally {
      await client.end();
  }
}

const s3 = new aws.S3({
  accessKeyId: 'AKIAUOCB6YFULUAGXDRE',
  secretAccessKey: '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',
  region: 'us-east-1'
});

async function uploadImageToS3(imageData) {
  const params = {
    Bucket: 'jobfinderimage',
    Key: `images/${Date.now()}_${Math.floor(Math.random() * 1000)}.png`,
    Body: imageData,
    ContentType: 'image/png'
  };

  try {
    const { Location } = await s3.upload(params).promise();
    return Location; // Return S3 URL
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    throw error;
  }
}

// Function to insert S3 URL into PostgreSQL
/*async function insertImageURLIntoDB(s3Url) {
  const client = new Client({
    connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
  });

  try {
    await client.connect();
    const query = 'INSERT INTO JB_JOBS (logo_url) VALUES ($1) RETURNING id';
    const values = [s3Url];
    const result = await client.query(query, values);
    return result.rows[0].id; // Return inserted row id
  } catch (error) {
    console.error('Error inserting URL into database:', error);
    throw error;
  } finally {
    await client.end();
  }
}
*/
async function insertData(company_name, website, job_title, work_loc, commitment, remote, job_link, description, name, email, imageData) {
  try {
    const s3Url = await uploadImageToS3(imageData);
   // const imgURL = await insertImageURLIntoDB(s3Url);
    
    const client = new Client({
        connectionString: "postgresql://nikhilchopra788:homVKH6tCrJ5@ep-sparkling-dawn-a1iplsg1.ap-southeast-1.aws.neon.tech/jobfinder?sslmode=require"
    });
    await client.connect();

    // Check if the user already exists
    const checkUserQuery = 'SELECT id FROM JB_USERS WHERE email = $1';
    const checkUserValues = [email];
    const { rows: existingUsers } = await client.query(checkUserQuery, checkUserValues);

    let userId;

    // If user doesn't exist, insert the user
    if (existingUsers.length === 0) {
        const insertUserQuery = 'INSERT INTO JB_USERS (name, email) VALUES ($1, $2) RETURNING id';
        const insertUserValues = [name, email];
        const { rows: insertedUser } = await client.query(insertUserQuery, insertUserValues);
        userId = insertedUser[0].id;
        console.log("New user inserted:", insertedUser);
    } else {
        userId = existingUsers[0].id;
    }

    // Insert job using the user_id
    const insertJobQuery = 'INSERT INTO JB_JOBS (user_id, company_name, website, logo_url, job_title, work_loc, commitment, remote, job_link, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
    const insertJobValues = [userId, company_name, website, s3Url, job_title, work_loc, commitment, remote, job_link, description];
    const { rows: insertedJob } = await client.query(insertJobQuery, insertJobValues);

    console.log("Job inserted:");
    await client.end();

    return insertedJob;

  } catch (error) {
      console.error("Error executing query:", error);
  }
}

module.exports = {
    insertData,
    deleteData,
    updateData,
    getJobData,
    getuserjobData,
    getData
};