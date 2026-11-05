async function main(): Promise<void> {
  const { seedTrainingDesk } = await import("../src/server/collections/training");
  const result = seedTrainingDesk("triton");
  console.log(JSON.stringify({ demo: "collections", ...result }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed failed");
  process.exit(1);
});
