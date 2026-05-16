import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin-auth"
import { getConfigValue, setConfigValue } from "@/lib/config-store"
import crypto from "crypto"

function auth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return token && verifySessionToken(token)
}

export interface AdminVideo {
  id: string
  title: string
  company: string
  youtube_url: string
  reward: number
  duration: number
  active: boolean
  created_at: string
}

function getVideos(): AdminVideo[] {
  try {
    const raw = getConfigValue("videos_list")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveVideos(videos: AdminVideo[]) {
  setConfigValue("videos_list", JSON.stringify(videos))
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ videos: getVideos() })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, company, youtube_url, reward, duration } = body

  if (!youtube_url || !title) {
    return NextResponse.json({ error: "title and youtube_url are required" }, { status: 400 })
  }

  const videos = getVideos()
  const newVideo: AdminVideo = {
    id: crypto.randomUUID(),
    title: title.trim(),
    company: (company || "").trim(),
    youtube_url: youtube_url.trim(),
    reward: parseFloat(reward) || 0.05,
    duration: parseInt(duration) || 30,
    active: true,
    created_at: new Date().toISOString(),
  }

  videos.push(newVideo)
  saveVideos(videos)

  return NextResponse.json({ success: true, video: newVideo })
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, active } = body

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const videos = getVideos()
  const idx = videos.findIndex((v) => v.id === id)
  if (idx === -1) return NextResponse.json({ error: "Video not found" }, { status: 404 })

  if (typeof active === "boolean") videos[idx].active = active
  saveVideos(videos)

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const videos = getVideos().filter((v) => v.id !== id)
  saveVideos(videos)

  return NextResponse.json({ success: true })
}
