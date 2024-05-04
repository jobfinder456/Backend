const express = require("express");
const https = require('https');
const fs = require('fs');
const cors = require("cors");
const job = require('./routes/jobs');
const user = require('./routes/user');

// Create an Express application
const app = express();

// Enable CORS
app.use(cors());

// Define routes
app.use("/api/v1", job);
app.use("/api/v1", user);

// Paths to your SSL certificate and key files
const privateKeyPath = 'cert/ssl/private.key';
const certificatePath = 'cert/ssl/certificate.crt';


// Read the SSL certificate and key files
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const certificate = fs.readFileSync(certificatePath, 'utf8');

// Create credentials object
const credentials = { key: privateKey, cert: certificate };

// Define the port number
const PORT = 443;

// Create the HTTPS server using Express
const server = https.createServer(credentials, app);

// Start listening on the specified port
server.listen(PORT, () => {
  console.log(`Server running at ${PORT}/`);
});
