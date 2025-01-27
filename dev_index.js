const express = require("express");
const app = express();
const cors = require("cors");
const job = require("./routes/jobs");
const profile = require("./routes/form");
const pay = require("./routes/job-pay");
const user = require("./routes/user")
const user_pay = require("./routes/user-pay")
const cookieParser = require('cookie-parser');

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);

app.use(
  cors({
    credentials: true,
    origin: "https://getjobs.today",
  })
);

app.use("/api/v1", profile)
app.use("/api/v1", job);
app.use("/api/v1", pay);
app.use("/api/v1", user)
app.use("/api/v1", user_pay)

app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.listen(8282, () => {
  console.log("dev server started in port 8282");
});
