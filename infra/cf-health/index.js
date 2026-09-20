import postgres from "postgres";

export default {
  async fetch(_request, env) {
    const started = Date.now();
    const sql = postgres(env.HYPERDRIVE.connectionString, { max: 1, idle_timeout: 5 });
    try {
      const ping = await sql`SELECT 1 AS ok`;
      const snaps = await sql`
        SELECT app, version, updated_at,
               jsonb_array_length(COALESCE(payload->'contacts', '[]'::jsonb)) AS contacts,
               jsonb_array_length(COALESCE(payload->'accounts', '[]'::jsonb)) AS accounts
        FROM snapshots
        ORDER BY app`;
      return Response.json({
        ok: ping[0]?.ok === 1,
        latencyMs: Date.now() - started,
        host: "cloudflare-workers+hyperdrive+prisma-postgres",
        snapshots: snaps,
      });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          latencyMs: Date.now() - started,
          error: error instanceof Error ? error.message : "query failed",
        },
        { status: 500 },
      );
    } finally {
      await sql.end({ timeout: 2 });
    }
  },
};
