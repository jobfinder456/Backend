const express = require("express");
const app = express();
const cors = require("cors")
const job = require('./routes/jobs')
const user = require('./routes/user')

app.use(cors())
app.use("/api/v1", job)
app.use("/api/v1", user)

app.listen(8282, () => {
    console.log("server started in port 8282");
});