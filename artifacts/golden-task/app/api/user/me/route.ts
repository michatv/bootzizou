import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const telegramId = req.headers.get("x-telegram-id")
  if (!telegramId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*, wallets(*)")
    .eq("telegram_id", telegramId)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({ user })
}
