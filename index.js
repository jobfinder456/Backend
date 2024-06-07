const express = require("express");
const https = require("https");
const fs = require("fs");
const cors = require("cors");
const job = require("./routes/jobs");
const user = require("./routes/user");
const pay = require("./routes/job-pay");

const app = express();

app.use(
  cors({
    origin: "https://getjobs.today", 
  })
);

app.use("/api/v1", job);
app.use("/api/v1", user);
app.use("/api/v1", pay);

const privateKeyPath = "cert/ssl/private.key";
const certificatePath = "cert/ssl/get-jobs.xyz.chained.crt";

const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const certificate = fs.readFileSync(certificatePath, "utf8");

const credentials = { key: privateKey, cert: certificate };

const PORT = 443;

const server = https.createServer(credentials, app);

server.listen(PORT, () => {
  console.log(`Server running at ${PORT}/`);
});
