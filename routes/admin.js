const express = require("express");
const router = express.Router();
const axios = require("axios");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function executeQuery(query, values = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw new Error("Database operation failed");
  } finally {
    client.release();
  }
}

// POST route to create a new blog
router.post("/blogs", async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    const query = "INSERT INTO blogs (title, body) VALUES ($1, $2) RETURNING *";
    const result = await executeQuery(query, [title, body]);

    res.status(201).json({ success: true, blog: result[0] });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET route to fetch all blogs (only id and title)
router.get("/blogs", async (req, res) => {
    try {
      const query = "SELECT id, title, LEFT(body, 40) AS description FROM blogs";
      const blogs = await executeQuery(query);
      res.json({ success: true, blogs });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  

// GET route to fetch a single blog by ID
router.get("/blogs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = "SELECT title, body FROM blogs WHERE id = $1";
    const blog = await executeQuery(query, [id]);

    if (blog.length === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({ success: true, blog: blog[0] });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
