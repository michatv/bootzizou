import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { generateReferralCode, validateTelegramWebAppData } from "@/lib/telegram-auth"

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await req.json()
    const {
      telegram_id,
      first_name,
      last_name,
      username,
      photo_url,
      referral_code: refCode,
      init_data,
    } = body

    if (!telegram_id) {
      return NextResponse.json({ error: "Missing telegram_id" }, { status: 400 })
    }

    // Validate Telegram initData if bot token is configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (botToken && init_data) {
      const validatedUser = validateTelegramWebAppData(init_data, botToken)
      if (!validatedUser) {
        return NextResponse.json({ error: "Invalid Telegram authentication" }, { status: 401 })
      }
      // Ensure the telegram_id in the body matches what Telegram signed
      if (String(validatedUser.id) !== String(telegram_id)) {
        return NextResponse.json({ error: "Telegram ID mismatch" }, { status: 401 })
      }
    } else if (botToken && !init_data && process.env.NODE_ENV === "production") {
      // In production with bot token set, initData is required
      return NextResponse.json({ error: "Telegram authentication required" }, { status: 401 })
    }

    const telegramIdStr = String(telegram_id)

    let { data: user, error: fetchError } = await supabase
      .from("users")
      .select("*, wallets(*)")
      .eq("telegram_id", telegramIdStr)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!user) {
      const newReferralCode = generateReferralCode(Number(telegram_id))

      let referredBy: string | null = null
      if (refCode) {
        const { data: referrer } = await supabase
          .from("users")
          .select("id, referral_code")
          .eq("referral_code", refCode)
          .single()
        if (referrer) referredBy = referrer.referral_code
      }

      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          telegram_id: telegramIdStr,
          first_name,
          last_name,
          username,
          photo_url,
          referral_code: newReferralCode,
          referred_by: referredBy,
          vip_level: 1,
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      const { error: walletError } = await supabase
        .from("wallets")
        .insert({ user_id: newUser.id, balance: 0, total_earned: 0, total_withdrawn: 0, coins: 0 })

      if (walletError) {
        return NextResponse.json({ error: walletError.message }, { status: 500 })
      }

      if (referredBy) {
        const { data: referrer } = await supabase
          .from("users")
          .select("id")
          .eq("referral_code", referredBy)
          .single()

        if (referrer) {
          await supabase.from("referrals").insert({
            referrer_id: referrer.id,
            referred_id: newUser.id,
            earnings: 0,
          })
        }
      }

      const { data: fullUser } = await supabase
        .from("users")
        .select("*, wallets(*)")
        .eq("id", newUser.id)
        .single()

      return NextResponse.json({ user: fullUser, isNew: true })
    }

    await supabase
      .from("users")
      .update({
        first_name,
        last_name,
        username,
        photo_url,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_id", telegramIdStr)

    const { data: updatedUser } = await supabase
      .from("users")
      .select("*, wallets(*)")
      .eq("telegram_id", telegramIdStr)
      .single()

    return NextResponse.json({ user: updatedUser, isNew: false })
  } catch (err) {
    console.error("Auth error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
