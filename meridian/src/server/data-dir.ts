import path from "path";

/** Isolated tests set MERIDIAN_DATA_DIR. The desk default stays ./data. */
export function meridianDataDir(): string {
  const override = process.env.MERIDIAN_DATA_DIR;
  return override ? path.resolve(override) : path.join(process.cwd(), "data");
}
