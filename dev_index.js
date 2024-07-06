const express = require("express");
const app = express();
const cors = require("cors");
const job = require("./routes/jobs");
const user = require("./routes/user");
const pay = require("./routes/job-pay");
const blogs = require("./routes/blogs")

app.use(cors());
app.use("/api/v1", job);
app.use("/api/v1", user);
app.use("/api/v1", pay);
app.use("/api/blogs", blogs)

app.listen(8282, () => {
  console.log("server started in port 8282");
});
