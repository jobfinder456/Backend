//const cron = require('node-cron');
const { executeQuery } = require('./job_function');

// Define your task function
const taskFunction = async () => {
    console.log("entered")
    try {
        const queryText = `
            UPDATE jb_jobs 
            SET is_ok = FALSE 
            WHERE is_ok = TRUE 
              AND last_update < CURRENT_DATE - INTERVAL '1 day';
        `;
        await executeQuery(queryText);
        console.log('Scheduled job status update completed');
    } catch (error) {
        console.error('Error updating job statuses:', error);
    }
};

// Run the task function every minute
const interval = setInterval(taskFunction, 5000); // Run every minute

// Optionally, add an error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    clearInterval(interval); // Stop the interval to prevent further execution
});
