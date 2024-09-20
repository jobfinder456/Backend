const express = require("express");
const zod = require("zod");
const { register } = require("../db/user-pass");
const router = express.Router();

const emailSchema = zod.string().email('Invalid email address').optional().or(zod.literal(""));
const passwordSchema = zod.string().min(8).refine(
  (password) => /[A-Z]/.test(password) && /\d/.test(password),
  {
    message: "Password must contain at least one capital letter and one number",
  }
);

router.use(express.json());

router.get("/testsignup", async (req, res) => {
  console.log("GET /test_signup called");
  res.send("this is successful");
});

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const emailRes = emailSchema.safeParse(email);
  const passRes = passwordSchema.safeParse(password);

  if (!emailRes.success) {
    return res.status(400).send(emailRes.error.errors[0].message);
  }

  if (!passRes.success) {
    return res.status(400).send(passRes.error.errors[0].message);
  }

  try {
    const result = await register(email, password);
    if (!result) {
      return res.status(400).send("user already exists");
    }
    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;