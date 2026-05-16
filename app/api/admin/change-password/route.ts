import { NextRequest, NextResponse } from "next/server"
import {
  verifySessionToken,
  COOKIE_NAME,
  hashPassword,
  getAdminPasswordHash,
  setAdminPasswordHash,
} from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both passwords required" }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const storedHash = await getAdminPasswordHash()
    if (hashPassword(currentPassword) !== storedHash) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }

    await setAdminPasswordHash(hashPassword(newPassword))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
