const express = require("express");
const { getData, insertData, updateData, deleteData, getJobData } = require('../db/job');
const router = express.Router();

// Middleware to parse JSON request bodies
router.use(express.json());

router.get("/list", async (req, res) => {
    const all = await getData();
    res.json({ all });
});

router.get("/job/:id", async(req, res) => {
    const { id } = req.params;
    try {
        const result = await getJobData(id)
        res.status(201).json({ message: "Job found", result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.post("/insert", async (req, res) => {
    // Ensure req.body is properly parsed before accessing its properties
    const { company_name, website, job_title, work_loc, remote, job_link, description } = req.body;
    try {
        const result = await insertData(company_name, website, job_title, work_loc, remote, job_link, description);
        res.status(201).json({ message: "Data inserted successfully", result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/update/:id", async(req,res) => {
    const { id } = req.params
    const { company_name, website, job_title, work_loc, remote, job_link, description } = req.body;
    try {
        const result = await updateData(id,company_name, website, job_title, work_loc, remote, job_link, description);
        res.status(201).json({ message: "Data updated successfully", result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
})

router.delete("/delete/:id", async(req,res)=>{
  const { id }= req.params 
  try {
    const result = await deleteData(id);
    res.status(201).json({ message: "Data deleted successfully", result });
} catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
}
})
module.exports = router;
