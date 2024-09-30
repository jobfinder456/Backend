const express = require("express");
const app = express();
const cors = require("cors");
const job = require("./routes/jobs");
const profile = require("./routes/form");
const pay = require("./routes/job-pay");
const cookieParser = require('cookie-parser');

app.use(express.json());
app.use(cookieParser());


app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

app.use("/api/v1", profile)
app.use("/api/v1", job);
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
