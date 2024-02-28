const express = require("express");
const app = express();
const cors = require("cors")
const rootrouter = require('./routes/jobs')

app.use(cors())
app.use("/api/v1", rootrouter)

app.listen(3000, () => {
    console.log("server started in port 3000");
});
