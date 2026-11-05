export async function main(): Promise<void> {
  const { ensureOwnerSeat } = await import("../src/server/seed-owner");
  const result = ensureOwnerSeat();
  if (!result.email) {
    console.log(JSON.stringify({ owner: "skipped" }));
    return;
  }
  console.log(JSON.stringify({ owner: result.email, created: result.created, seated: result.seated }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "owner seed failed");
  process.exit(1);
});
