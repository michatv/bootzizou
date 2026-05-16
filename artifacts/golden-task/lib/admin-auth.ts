import crypto from "crypto"
import { getSupabaseAdmin } from "./supabase-server"

const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-production"
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

export const SETUP_SQL = `-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`

export function hashPassword(password: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(password)
    .digest("hex")
}

export function createSessionToken(): string {
  const payload = JSON.stringify({
    admin: true,
    iat: Date.now(),
    exp: Date.now() + SESSION_DURATION_MS,
    nonce: crypto.randomBytes(16).toString("hex"),
  })
  const encoded = Buffer.from(payload).toString("base64url")
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("hex")
  return `${encoded}.${sig}`
}

export function verifySessionToken(token: string): boolean {
  try {
    const [encoded, sig] = token.split(".")
    if (!encoded || !sig) return false
    const expectedSig = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encoded)
      .digest("hex")
    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(expectedSig, "hex")
      )
    )
      return false
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString())
    return payload.admin === true && Date.now() < payload.exp
  } catch {
    return false
  }
}

export async function getAdminPasswordHash(): Promise<string> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("admin_config")
      .select("password_hash")
      .eq("id", 1)
      .single()
    if (!error && data?.password_hash) return data.password_hash
  } catch {}
  const envPass = process.env.ADMIN_PASSWORD
  if (envPass) return hashPassword(envPass)
  return hashPassword("admin123")
}

export async function setAdminPasswordHash(
  hash: string
): Promise<{ ok: boolean; setupRequired?: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from("admin_config")
      .upsert({ id: 1, password_hash: hash, updated_at: new Date().toISOString() })
    if (error) {
      if (error.code === "42P01") return { ok: false, setupRequired: true }
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unknown error" }
  }
}

export const COOKIE_NAME = "admin_session"
