import { NextRequest, NextResponse } from "next/server"
import {
  hashPassword,
  getAdminPasswordHash,
  createSessionToken,
  COOKIE_NAME,
} from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 })
    }

    const storedHash = await getAdminPasswordHash()
    const inputHash = hashPassword(password)

    if (inputHash !== storedHash) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    const token = createSessionToken()
    const maxAge = 24 * 60 * 60

    const res = NextResponse.json({ success: true })
    res.headers.set(
      "Set-Cookie",
      [
        `${COOKIE_NAME}=${token}`,
        `Max-Age=${maxAge}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        process.env.NODE_ENV === "production" ? "Secure" : "",
      ]
        .filter(Boolean)
        .join("; ")
    )
    return res
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
