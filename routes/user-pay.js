const express = require("express");
const router = express.Router();
const { updateCredits, getUserCredits, updateJobStatus, deductUserCredits, addUserCredits } = require("../db/user-pay"); // Assuming queries file for database operations

router.post("/toggle", async (req, res) => {
    const { job_id, is_ok, email } = req.body;
  
    if (!job_id || typeof is_ok === "undefined" || !email) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }
  
    try {
      // Get user credits
      const userCredits = await getUserCredits(email);
  /*
      if (userCredits === null ) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
  */
      if (is_ok) {
        // If is_ok is true and the user has enough credits
        if (userCredits > 0 ) {
          await updateJobStatus(job_id, is_ok); // Update job status
          await deductUserCredits(email); // Deduct one credit
          return res.status(200).json({ success: true, message: "Job updated and credits deducted successfully." });
        } else {
          return res.status(400).json({ success: false, message: "Insufficient credits." });
        }
      } else {
        // If is_ok is false
        await updateJobStatus(job_id, is_ok); // Update job status
        await addUserCredits(email); // Add one credit
        return res.status(200).json({ success: true, message: "Job updated and one credit added successfully." });
      }
    } catch (error) {
      console.error("Error in /toggle route:", error);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
  });



module.exports = router;
