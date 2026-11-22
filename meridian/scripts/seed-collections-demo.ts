export async function main(): Promise<void> {
  const { seedTrainingDesk } = await import("../src/server/collections/training");
  const triton = seedTrainingDesk("triton");
  const harbor = seedTrainingDesk("aether");
  console.log(JSON.stringify({ demo: "collections", triton, harbor }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed failed");
  process.exit(1);
});
