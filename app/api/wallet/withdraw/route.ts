import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

const MIN_WITHDRAWAL = 5
const MAX_WITHDRAWAL = 10000

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const telegramId = req.headers.get("x-telegram-id")
  if (!telegramId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { amount, address } = body

  if (!amount || !address) {
    return NextResponse.json({ error: "Amount and address are required" }, { status: 400 })
  }

  const numAmount = parseFloat(amount)
  if (isNaN(numAmount) || numAmount < MIN_WITHDRAWAL) {
    return NextResponse.json({ error: `Minimum withdrawal is $${MIN_WITHDRAWAL}` }, { status: 400 })
  }
  if (numAmount > MAX_WITHDRAWAL) {
    return NextResponse.json({ error: `Maximum withdrawal is $${MAX_WITHDRAWAL}` }, { status: 400 })
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single()

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!wallet || wallet.balance < numAmount) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
  }

  const { error: deductError } = await supabase
    .from("wallets")
    .update({
      balance: wallet.balance - numAmount,
      total_withdrawn: wallet.total_withdrawn + numAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  if (deductError) {
    return NextResponse.json({ error: "Failed to process withdrawal" }, { status: 500 })
  }

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "withdrawal",
      amount: -numAmount,
      status: "pending",
      address,
    })
    .select()
    .single()

  if (txError) {
    return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 })
  }

  return NextResponse.json({ success: true, transaction: tx })
}
