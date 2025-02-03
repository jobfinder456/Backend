const express = require("express");
const router = express.Router();
const { updateCredits, getUserCredits, updateJobStatus, deductUserCredits, addUserCredits } = require("../db/user-pay"); // Assuming queries file for database operations
const { authMiddleware } = require("../auth/middleware");

router.put("/toggle",authMiddleware, async (req, res) => {
    const { job_id, is_ok } = req.body;
    const email = req.email
    if (!job_id || typeof is_ok === "undefined" || !email) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }
  
    try {
      const userCredits = await getUserCredits(email);
  
      if (userCredits === null ) {
        return res.status(404).json({ success: false, message: "User has no credits" });
      }
      if (is_ok) {
        if (userCredits > 0 ) {
          await updateJobStatus(job_id, is_ok); 
          await deductUserCredits(email); 
          return res.status(200).json({ success: true, message: "Job updated and credits deducted successfully." });
        } else {
          return res.status(400).json({ success: false, message: "Insufficient credits." });
        }
      } else {
        await updateJobStatus(job_id, is_ok); 
        await addUserCredits(email); 
        return res.status(200).json({ success: true, message: "Job updated and one credit added successfully." });
      }
    } catch (error) {
      console.error("Error in /toggle route:", error);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
  });

module.exports = router;