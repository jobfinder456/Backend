const express = require("express");
const app = express();
const cors = require("cors");
const usersignup = require("./routes/signup");
const usersignin = require("./routes/signin");
const userotp = require("./routes/otpsend");
const job = require("./routes/jobs");
const userforget = require("./routes/forgetpass");
const pay = require("./routes/job-pay");

app.use(express.json());

app.use(
  cors()
);

app.use("/api/v1", usersignup);
app.use("/api/v1", usersignin);
app.use("/api/v1", userotp);
app.use("/api/v1", job);
app.use("/api/v1", userforget);
app.use("/api/v1", pay);

app.get("/test_index", async(req,res)=>{
   res.send("this is succesfull")
})

app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.listen(8282, () => {
  console.log("dev server started in port 8282");
});
