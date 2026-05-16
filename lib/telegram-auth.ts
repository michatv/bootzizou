import crypto from "crypto"

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface TelegramWebAppUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

export function validateTelegramWebAppData(initData: string, botToken: string): TelegramWebAppUser | null {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get("hash")
    if (!hash) return null

    params.delete("hash")

    const entries = Array.from(params.entries())
    entries.sort(([a], [b]) => a.localeCompare(b))
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n")

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()
    const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

    if (expectedHash !== hash) return null

    const authDate = parseInt(params.get("auth_date") || "0")
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) return null

    const userStr = params.get("user")
    if (!userStr) return null

    return JSON.parse(userStr) as TelegramWebAppUser
  } catch {
    return null
  }
}

export function generateReferralCode(telegramId: number): string {
  return `REF${telegramId.toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}
