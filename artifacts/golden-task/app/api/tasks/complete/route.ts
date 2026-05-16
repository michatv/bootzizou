import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const telegramId = req.headers.get("x-telegram-id")
  if (!telegramId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { task_id } = body

  if (!task_id) {
    return NextResponse.json({ error: "task_id is required" }, { status: 400 })
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single()

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", task_id)
    .eq("is_active", true)
    .single()

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

  const { data: existing } = await supabase
    .from("user_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("task_id", task_id)
    .single()

  if (existing?.completed) {
    return NextResponse.json({ error: "Task already completed" }, { status: 400 })
  }

  const { error: upsertError } = await supabase
    .from("user_tasks")
    .upsert({
      user_id: user.id,
      task_id,
      completed: true,
      progress: 100,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,task_id" })

  if (upsertError) {
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 })
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (wallet) {
    await supabase.from("wallets").update({
      balance: wallet.balance + task.reward,
      total_earned: wallet.total_earned + task.reward,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id)
  }

  await supabase.from("transactions").insert({
    user_id: user.id,
    type: "earning",
    amount: task.reward,
    status: "completed",
    source: task.title,
  })

  return NextResponse.json({ success: true, reward: task.reward })
}
