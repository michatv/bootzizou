import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("*, users(id, first_name, last_name, username, telegram_id)")
    .eq("type", "withdrawal")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const formatted = (txs || []).map((tx) => {
    const u = tx.users as any
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.username || `User ${u?.telegram_id}`
    return {
      id: tx.id,
      userId: tx.user_id,
      user: name,
      amount: Math.abs(tx.amount),
      address: tx.address ?? "—",
      status: tx.status === "completed" ? "approved" : tx.status === "failed" ? "rejected" : "pending",
      date: tx.created_at?.slice(0, 16).replace("T", " ") ?? "",
    }
  })

  return NextResponse.json({ withdrawals: formatted })
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { txId, action } = await req.json()

  if (action === "approve") {
    await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", txId)
  }

  if (action === "reject") {
    const { data: tx } = await supabase
      .from("transactions")
      .select("user_id, amount")
      .eq("id", txId)
      .single()

    if (tx) {
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", txId)

      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance, total_withdrawn")
        .eq("user_id", tx.user_id)
        .single()

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            balance: wallet.balance + Math.abs(tx.amount),
            total_withdrawn: Math.max(0, wallet.total_withdrawn - Math.abs(tx.amount)),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", tx.user_id)
      }
    }
  }

  return NextResponse.json({ success: true })
}
