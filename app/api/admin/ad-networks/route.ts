import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, COOKIE_NAME, SETUP_SQL } from "@/lib/admin-auth"
import { getConfigsWithPrefix, setConfigValue, deleteConfigValue } from "@/lib/config-store"

function auth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return token && verifySessionToken(token)
}

async function trySupabaseGet() {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase-server")
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("app_config")
      .select("key, value")
      .like("key", "adnet_%")
    return { data, error }
  } catch {
    return { data: null, error: { code: "unavailable", message: "Supabase not configured" } }
  }
}

async function trySupabaseUpsert(key: string, value: string) {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase-server")
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("app_config").upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    })
    return { error }
  } catch {
    return { error: { code: "unavailable" } }
  }
}

async function trySupabaseDelete(key: string) {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase-server")
    const supabase = getSupabaseAdmin()
    await supabase.from("app_config").delete().eq("key", key)
  } catch {}
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await trySupabaseGet()

  let rows: { key: string; value: string }[] = []

  if (error) {
    // Supabase unavailable — fall back to local file store
    const localData = getConfigsWithPrefix("adnet_")
    rows = Object.entries(localData).map(([key, value]) => ({ key, value }))
  } else {
    rows = (data || []) as { key: string; value: string }[]
    // Merge any local values not yet in Supabase
    const localData = getConfigsWithPrefix("adnet_")
    const supabaseKeys = new Set(rows.map((r) => r.key))
    for (const [key, value] of Object.entries(localData)) {
      if (!supabaseKeys.has(key)) rows.push({ key, value })
    }
  }

  const configs: Record<string, Record<string, string>> = {}
  for (const row of rows) {
    const networkId = row.key.replace("adnet_", "")
    try {
      configs[networkId] = JSON.parse(row.value)
    } catch {}
  }

  return NextResponse.json({ configs })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { networkId, fields, connected } = body

  if (!networkId) return NextResponse.json({ error: "networkId required" }, { status: 400 })

  const key = `adnet_${networkId}`

  if (connected) {
    const value = JSON.stringify(fields || {})

    // Try Supabase first
    const { error } = await trySupabaseUpsert(key, value)

    if (error) {
      if ((error as { code: string }).code === "42P01") {
        // Table doesn't exist — inform admin but still save locally
        setConfigValue(key, value)
        return NextResponse.json({
          success: true,
          warning: "Saved locally (Supabase app_config table not set up). Run the setup SQL to persist in the cloud.",
          sql: SETUP_SQL,
        })
      }
      // Other Supabase error — fall back silently to local store
      setConfigValue(key, value)
    } else {
      // Supabase succeeded — also save locally for fast reads
      setConfigValue(key, value)
    }
  } else {
    await trySupabaseDelete(key)
    deleteConfigValue(key)
  }

  return NextResponse.json({ success: true })
}
