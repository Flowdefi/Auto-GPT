import { runDueJobs } from "../src/server/collections/runner";

const results = await runDueJobs();
console.log(JSON.stringify({ ran: results.length, results }, null, 2));
