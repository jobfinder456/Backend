const express = require("express");
const { getData, insertData, updateData, deleteData, getJobData, getuserjobData } = require('../db/job');
const zod = require("zod")
const router = express.Router();

// Middleware to parse JSON request bodies
router.use(express.json());

const postSchema = zod.object({
    company_name: zod.string().min(1),
    website: zod.string().min(5),
    job_title: zod.string().min(5),
    work_loc: zod.string().min(2),
    remote: zod.boolean(),
    job_link: zod.string().min(3),
    description: zod.string().min(50),
})

router.post("/users-list", async(req,res)=>{
    const {email} = req.body
    const all = await getuserjobData(email)
    res.json({ all })
})

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

    const { company_name, website, job_title, work_loc, commitment, remote, job_link, description, name, email } = req.body;

    try {

        /*const {success} = postSchema.safeParse(req.body)
        if(!success) {
            return res.status(411).json({message: "Invalid inputs"})
        }
        */
        const result = await insertData(company_name, website, job_title, work_loc, commitment, remote, job_link, description, name, email);
        res.status(201).json({ message: "Data inserted successfully", result });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/update/:id", async(req,res) => {

    const { id } = req.params
    const { company_name, website, job_title, work_loc, commitment, remote, job_link, description } = req.body;

    try {

        const {success} = postSchema.safeParse(req.body)
        if(!success) {
            return res.status(411).json({message: "Invalid inputs"})
        }

        const result = await updateData(id,company_name, website, job_title, work_loc, commitment, remote, job_link, description);
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
