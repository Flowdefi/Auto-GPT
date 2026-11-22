export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Next strips this branch from the Edge instrumentation bundle. A static
    // import would pull fs and crypto into that bundle and fail the build.
    const { startGraphSyncLoop } = await import("./server/graph-sync");
    startGraphSyncLoop();
  }
}
