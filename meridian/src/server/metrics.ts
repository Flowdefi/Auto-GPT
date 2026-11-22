import { loadDb } from "@/server/db";

export function metricsSnapshot() {
  const db = loadDb();
  const openComplaints = (db.complaints ?? []).filter((row) => row.status === "open").length;
  const threshold = Number(process.env.MERIDIAN_ALERT_OPEN_COMPLAINTS ?? 25);
  const alerts: string[] = [];
  if (Number.isFinite(threshold) && openComplaints >= threshold) alerts.push("open_complaints");
  const failedJobs = (db.jobs ?? []).filter((job) => job.status === "failed").length;
  if (failedJobs > 0) alerts.push("failed_jobs");
  return {
    accounts: (db.portfolioAccounts ?? []).length,
    openComplaints,
    payments: (db.consumerPayments ?? []).length,
    failedJobs,
    alerts,
  };
}
