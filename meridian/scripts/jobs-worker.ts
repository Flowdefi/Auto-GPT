import { jobIntervalSeconds } from "../src/lib/collections/jobs";
import { runDueJobs } from "../src/server/collections/runner";

const seconds = jobIntervalSeconds();
console.log(JSON.stringify({ worker: "collections-jobs", everySeconds: seconds }));

async function tick(): Promise<void> {
  try {
    const results = await runDueJobs();
    if (results.length > 0) console.log(JSON.stringify({ ran: results.length }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Job tick failed");
  }
}

void tick();
const timer = setInterval(() => void tick(), seconds * 1000);
process.on("SIGTERM", () => {
  clearInterval(timer);
  process.exit(0);
});
