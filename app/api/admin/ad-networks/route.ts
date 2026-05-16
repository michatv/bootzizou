import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, COOKIE_NAME, SETUP_SQL } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"

function auth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return token && verifySessionToken(token)
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("app_config")
    .select("key, value")
    .like("key", "adnet_%")

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "setup_required", sql: SETUP_SQL }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const configs: Record<string, Record<string, string>> = {}
  for (const row of data || []) {
    const networkId = row.key.replace("adnet_", "")
    try { configs[networkId] = JSON.parse(row.value) } catch {}
  }

  return NextResponse.json({ configs })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { networkId, fields, connected } = await req.json()

  if (!networkId) return NextResponse.json({ error: "networkId required" }, { status: 400 })

  if (connected) {
    const { error } = await supabase.from("app_config").upsert({
      key: `adnet_${networkId}`,
      value: JSON.stringify(fields || {}),
      updated_at: new Date().toISOString(),
    })
    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "setup_required", sql: SETUP_SQL }, { status: 503 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    await supabase.from("app_config").delete().eq("key", `adnet_${networkId}`)
  }

  return NextResponse.json({ success: true })
}
