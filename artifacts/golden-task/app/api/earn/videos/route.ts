import { NextRequest, NextResponse } from "next/server"
import { getConfigValue } from "@/lib/config-store"

interface AdminVideo {
  id: string
  title: string
  company: string
  youtube_url: string
  reward: number
  duration: number
  active: boolean
}

const BATCH_SIZE = 5

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url)
    // youtu.be/ID
    if (u.hostname === "youtu.be") return u.pathname.slice(1)
    // youtube.com/watch?v=ID
    const v = u.searchParams.get("v")
    if (v) return v
    // youtube.com/embed/ID or youtube.com/shorts/ID
    const parts = u.pathname.split("/").filter(Boolean)
    if (["embed", "shorts", "v"].includes(parts[0])) return parts[1]
  } catch {}
  return null
}

function getAllActiveVideos(): AdminVideo[] {
  try {
    const raw = getConfigValue("videos_list")
    const all: AdminVideo[] = raw ? JSON.parse(raw) : []
    return all.filter((v) => v.active)
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(0, parseInt(searchParams.get("page") || "0"))

  const all = getAllActiveVideos()

  if (all.length === 0) {
    return NextResponse.json({ videos: [], total: 0, page, hasMore: false })
  }

  const total = all.length
  const totalBatches = Math.ceil(total / BATCH_SIZE)
  const safePage = page % totalBatches // cycle when past end

  const start = safePage * BATCH_SIZE
  const batch = all.slice(start, start + BATCH_SIZE)

  const videos = batch.map((v) => ({
    id: v.id,
    title: v.title,
    company: v.company,
    youtube_id: extractYoutubeId(v.youtube_url),
    youtube_url: v.youtube_url,
    reward: v.reward,
    duration: v.duration,
  }))

  return NextResponse.json({
    videos,
    total,
    page: safePage,
    batchSize: BATCH_SIZE,
    hasMore: total > BATCH_SIZE,
    nextPage: (safePage + 1) % totalBatches,
  })
}
