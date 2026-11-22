import { accountByEmail, accountHasSeat, createAccount, markAccountActive } from "@/server/auth";
import { createLicense } from "@/server/billing";

const OWNER_EMAIL = "portfolios@debtmarket.net";

/**
 * Creates the owner seat when MERIDIAN_OWNER_PASSWORD is set.
 * The password is never logged. An existing account keeps its password.
 * MFA is not enrolled here.
 */
export function ensureOwnerSeat(env?: { MERIDIAN_OWNER_EMAIL?: string; MERIDIAN_OWNER_PASSWORD?: string }): { email: string; created: boolean; seated: boolean; warning: string | null } {
  const source = env ?? { MERIDIAN_OWNER_EMAIL: process.env.MERIDIAN_OWNER_EMAIL, MERIDIAN_OWNER_PASSWORD: process.env.MERIDIAN_OWNER_PASSWORD };
  const password = source.MERIDIAN_OWNER_PASSWORD ?? "";
  if (!password) return { email: "", created: false, seated: false, warning: null };
  if (password.length < 12 || password.length > 128) {
    return {
      email: (source.MERIDIAN_OWNER_EMAIL || OWNER_EMAIL).trim().toLowerCase(),
      created: false,
      seated: false,
      warning: "MERIDIAN_OWNER_PASSWORD must be 12 to 128 characters. The owner seat was not created. The desk is still starting.",
    };
  }
  const email = (source.MERIDIAN_OWNER_EMAIL || OWNER_EMAIL).trim().toLowerCase();
  let account = accountByEmail(email);
  let created = false;
  if (!account) {
    account = createAccount({ email, name: "DebtMarket Owner", password });
    created = true;
  }
  markAccountActive(account.id);
  if (!accountHasSeat(account.id)) {
    createLicense({
      kind: "minted",
      email,
      accountId: account.id,
      notes: "Owner seat created at startup. Password was not stored in the license.",
    });
  }
  return { email, created, seated: accountHasSeat(account.id), warning: null };
}
