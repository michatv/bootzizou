import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const { data: users, error } = await supabase
    .from("users")
    .select("*, wallets(*)")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: referralCounts } = await supabase
    .from("referrals")
    .select("referrer_id")

  const referralMap: Record<string, number> = {}
  for (const r of referralCounts || []) {
    referralMap[r.referrer_id] = (referralMap[r.referrer_id] || 0) + 1
  }

  const formatted = (users || []).map((u) => ({
    id: u.id,
    name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || `User ${u.telegram_id}`,
    email: u.username ? `@${u.username}` : `TG: ${u.telegram_id}`,
    balance: u.wallets?.balance ?? 0,
    referrals: referralMap[u.id] || 0,
    status: "active" as const,
    vip: u.vip_level ?? 1,
    joinDate: u.created_at?.slice(0, 10) ?? "",
    totalEarnings: u.wallets?.total_earned ?? 0,
    videosWatched: 0,
    telegram_id: u.telegram_id,
  }))

  return NextResponse.json({ users: formatted })
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { userId, action, balance } = await req.json()

  if (action === "updateBalance") {
    const { error } = await supabase
      .from("wallets")
      .update({ balance, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === "delete") {
    const { error } = await supabase.from("users").delete().eq("id", userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
