import { NextResponse } from "next/server"
import { COOKIE_NAME } from "@/lib/admin-auth"

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.headers.set(
    "Set-Cookie",
    `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
  )
  return res
}
