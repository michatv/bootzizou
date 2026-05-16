import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

const PRIZES = [0.10, 0.50, 1.00, 0.25, 5.00, 0.05, 10.00, 0.15]
const WEIGHTS = [25, 20, 10, 20, 3, 30, 1, 15]
const MAX_DAILY_SPINS = 3

function weightedRandom(prizes: number[], weights: number[]): { prize: number; index: number } {
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < prizes.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return { prize: prizes[i], index: i }
  }
  return { prize: prizes[prizes.length - 1], index: prizes.length - 1 }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const telegramId = req.headers.get("x-telegram-id")
  if (!telegramId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single()

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("spin_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", today.toISOString())

  const spinsUsed = count || 0
  if (spinsUsed >= MAX_DAILY_SPINS) {
    return NextResponse.json({ error: "No spins remaining today", spinsRemaining: 0 }, { status: 400 })
  }

  const { prize, index } = weightedRandom(PRIZES, WEIGHTS)

  await supabase.from("spin_history").insert({ user_id: user.id, prize })

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (wallet) {
    await supabase.from("wallets").update({
      balance: wallet.balance + prize,
      total_earned: wallet.total_earned + prize,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id)
  }

  await supabase.from("transactions").insert({
    user_id: user.id,
    type: "spin",
    amount: prize,
    status: "completed",
    source: "Lucky Wheel",
  })

  return NextResponse.json({
    success: true,
    prize,
    prizeIndex: index,
    spinsRemaining: MAX_DAILY_SPINS - spinsUsed - 1,
  })
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const telegramId = req.headers.get("x-telegram-id")
  if (!telegramId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single()

  if (!user) return NextResponse.json({ spinsRemaining: 0 }, { status: 200 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("spin_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", today.toISOString())

  return NextResponse.json({ spinsRemaining: Math.max(0, 3 - (count || 0)) })
}
