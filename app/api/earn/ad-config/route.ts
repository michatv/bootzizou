import { NextRequest, NextResponse } from "next/server"
import { getConfigsWithPrefix } from "@/lib/config-store"

// Fields exposed to the frontend (safe — no secret keys)
const SAFE_FIELDS: Record<string, string[]> = {
  monetag:     ["siteId", "rewardedZoneId", "interstitialZoneId", "pushZoneId"],
  admob:       ["appId", "rewardedUnitId"],
  unity:       ["gameId", "rewardedPlacementId"],
  applovin:    ["rewardedAdUnitId"],
  ironsource:  ["appKey", "rewardedPlacementName"],
  facebook:    ["appId", "rewardedPlacementId"],
  vungle:      ["appId", "rewardedPlacementId"],
  chartboost:  ["appId", "rewardedLocation"],
  mintegral:   ["appId", "rewardedUnitId"],
}

async function getFromSupabase() {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase-server")
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("app_config")
      .select("key, value")
      .like("key", "adnet_%")
    return { data, error }
  } catch {
    return { data: null, error: { code: "unavailable" } }
  }
}

export async function GET(_req: NextRequest) {
  const { data, error } = await getFromSupabase()

  let rows: { key: string; value: string }[] = []

  if (error) {
    const localData = getConfigsWithPrefix("adnet_")
    rows = Object.entries(localData).map(([key, value]) => ({ key, value }))
  } else {
    rows = (data || []) as { key: string; value: string }[]
    const localData = getConfigsWithPrefix("adnet_")
    const supabaseKeys = new Set(rows.map((r) => r.key))
    for (const [key, value] of Object.entries(localData)) {
      if (!supabaseKeys.has(key)) rows.push({ key, value })
    }
  }

  const activeNetworks: Array<{
    networkId: string
    fields: Record<string, string>
  }> = []

  for (const row of rows) {
    const networkId = row.key.replace("adnet_", "")
    try {
      const allFields: Record<string, string> = JSON.parse(row.value)
      const safeKeys = SAFE_FIELDS[networkId] ?? []
      const safeFields: Record<string, string> = {}
      for (const k of safeKeys) {
        if (allFields[k]) safeFields[k] = allFields[k]
      }
      if (Object.keys(safeFields).length > 0) {
        activeNetworks.push({ networkId, fields: safeFields })
      }
    } catch {}
  }

  return NextResponse.json({ activeNetworks })
}
