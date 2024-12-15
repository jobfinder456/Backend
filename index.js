const express = require("express");
const app = express();
const cors = require("cors");
const mainRouter = require("./routes/main")
const cookieParser = require('cookie-parser');

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

app.use("/api/v1", mainRouter)

app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.listen(8282, () => {
  console.log("dev server started in port 8282");
});
