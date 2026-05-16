"use client"

import { useState, useEffect, useCallback } from "react"
import { Play, CheckCircle2, ExternalLink, MessageCircle, Globe, UserPlus, Calendar, Gift, X, Volume2, VolumeX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useUser } from "@/context/user-context"

const videos = [
  { id: 1, title: "Crypto Trading Tips", reward: 0.05, duration: 30, thumbnail: "bg-gradient-to-br from-blue-600 to-purple-600" },
  { id: 2, title: "DeFi Explained", reward: 0.08, duration: 45, thumbnail: "bg-gradient-to-br from-green-600 to-teal-600" },
  { id: 3, title: "NFT Marketplace", reward: 0.06, duration: 30, thumbnail: "bg-gradient-to-br from-orange-600 to-red-600" },
  { id: 4, title: "Blockchain Basics", reward: 0.10, duration: 60, thumbnail: "bg-gradient-to-br from-pink-600 to-rose-600" },
]

const wheelPrizes = ["$0.10", "$0.50", "$1.00", "$0.25", "$5.00", "$0.05", "$10.00", "$0.15"]

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  Globe,
  UserPlus,
  Calendar,
  Play,
  Gift,
}

interface Task {
  id: string
  title: string
  description: string
  reward: number
  icon: string
  action_url: string | null
  task_type: string
  completed?: boolean
}

export function EarnScreen() {
  const { telegramId, authHeaders, refreshWallet } = useUser()

  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [completingTask, setCompletingTask] = useState<string | null>(null)

  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinsRemaining, setSpinsRemaining] = useState(3)
  const [wonPrize, setWonPrize] = useState<string | null>(null)
  const [showPrizeDialog, setShowPrizeDialog] = useState(false)

  const [taskCompletedDialog, setTaskCompletedDialog] = useState(false)
  const [completedTaskReward, setCompletedTaskReward] = useState(0)

  const [watchingVideo, setWatchingVideo] = useState<typeof videos[0] | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [watchedVideos, setWatchedVideos] = useState<number[]>([])
  const [todayWatched, setTodayWatched] = useState(0)
  const [earnedAmount, setEarnedAmount] = useState(0)
  const [showReward, setShowReward] = useState(false)

  const fetchTasks = useCallback(async () => {
    if (!telegramId) { setTasksLoading(false); return }
    setTasksLoading(true)
    try {
      const res = await fetch("/api/tasks", { headers: authHeaders })
      const data = await res.json()
      if (data.tasks) setTasks(data.tasks)
    } catch {}
    finally { setTasksLoading(false) }
  }, [telegramId, authHeaders])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => setTimeRemaining((p) => p - 1), 1000)
    } else if (timeRemaining === 0 && watchingVideo && isPlaying) {
      handleVideoComplete()
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isPlaying, timeRemaining, watchingVideo])

  const handleVideoComplete = useCallback(() => {
    if (!watchingVideo) return
    setIsPlaying(false)
    setEarnedAmount(watchingVideo.reward)
    setShowReward(true)
    setWatchedVideos((p) => [...p, watchingVideo.id])
    setTodayWatched((p) => p + 1)
    setTimeout(() => {
      setShowReward(false)
      setWatchingVideo(null)
      setEarnedAmount(0)
    }, 2000)
  }, [watchingVideo])

  const startWatching = (video: typeof videos[0]) => {
    setWatchingVideo(video)
    setTimeRemaining(video.duration)
    setIsPlaying(true)
    setShowReward(false)
  }

  const closeVideoDialog = () => {
    setWatchingVideo(null)
    setIsPlaying(false)
    setTimeRemaining(0)
    setShowReward(false)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  const handleSpin = async () => {
    if (spinning || spinsRemaining <= 0) return
    setSpinning(true)

    if (telegramId) {
      try {
        const res = await fetch("/api/rewards/spin", { method: "POST", headers: authHeaders })
        const data = await res.json()
        if (data.success) {
          const prizeIndex = data.prizeIndex ?? Math.floor(Math.random() * 8)
          const targetRotation = rotation + 1800 + prizeIndex * 45 + Math.random() * 30
          setRotation(targetRotation)
          setSpinsRemaining(data.spinsRemaining ?? spinsRemaining - 1)
          setTimeout(() => {
            setSpinning(false)
            setWonPrize(`$${data.prize.toFixed(2)}`)
            setShowPrizeDialog(true)
            refreshWallet()
          }, 4000)
          return
        }
      } catch {}
    }

    const prizeIndex = Math.floor(Math.random() * 8)
    const targetRotation = rotation + 1800 + prizeIndex * 45 + Math.random() * 30
    setRotation(targetRotation)
    setSpinsRemaining((p) => p - 1)
    setTimeout(() => {
      setSpinning(false)
      setWonPrize(wheelPrizes[prizeIndex])
      setShowPrizeDialog(true)
    }, 4000)
  }

  const handleStartTask = async (task: Task) => {
    if (task.completed || completingTask) return
    if (task.action_url) window.open(task.action_url, "_blank")
    setCompletingTask(task.id)
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ task_id: task.id }),
      })
      const data = await res.json()
      if (data.success) {
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: true } : t))
        setCompletedTaskReward(task.reward)
        setTaskCompletedDialog(true)
        setTimeout(() => setTaskCompletedDialog(false), 2500)
        refreshWallet()
      }
    } catch {}
    finally { setCompletingTask(null) }
  }

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="flex flex-col gap-4 p-4 safe-area-top">
      <h1 className="text-2xl font-bold text-foreground">Earn Rewards</h1>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary/50">
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="spin">Spin</TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Watch ads and earn USDT</p>
            <Badge variant="outline" className="border-primary text-primary">{todayWatched}/50 today</Badge>
          </div>

          {videos.map((video) => {
            const isWatched = watchedVideos.includes(video.id)
            return (
              <Card key={video.id} className={cn("glass-card overflow-hidden", isWatched && "opacity-60")}>
                <CardContent className="p-0">
                  <div className="flex gap-3">
                    <div className={cn("relative h-24 w-32 flex-shrink-0", video.thumbnail)}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                          {isWatched ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <Play className="h-5 w-5 text-white" fill="white" />}
                        </div>
                      </div>
                      <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                        {formatTime(video.duration)}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-between py-2 pr-3">
                      <div>
                        <h3 className="font-medium text-foreground line-clamp-1">{video.title}</h3>
                        <p className="mt-1 text-sm font-semibold text-primary">+${video.reward.toFixed(2)} USDT</p>
                      </div>
                      <Button
                        size="sm"
                        className={cn("w-fit", isWatched ? "bg-green-600" : "primary-gradient")}
                        onClick={() => !isWatched && startWatching(video)}
                        disabled={isWatched}
                      >
                        {isWatched ? "Watched" : "Watch Now"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Daily video progress</span>
                <span className="text-sm font-medium text-foreground">{todayWatched}/50</span>
              </div>
              <Progress value={(todayWatched / 50) * 100} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">Watch {Math.max(0, 50 - todayWatched)} more videos to earn bonus +$0.50</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Complete tasks to earn more</p>
            {!tasksLoading && (
              <Badge variant="outline" className="border-success text-success">{completedCount}/{tasks.length} done</Badge>
            )}
          </div>

          {tasksLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="glass-card"><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))
          ) : tasks.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Gift className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No tasks available right now</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Check back soon for new tasks</p>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => {
              const Icon = iconMap[task.icon] ?? Gift
              return (
                <Card key={task.id} className={cn("glass-card overflow-hidden", task.completed && "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", task.completed ? "bg-success/20" : "bg-primary/20")}>
                        <Icon className={cn("h-5 w-5", task.completed ? "text-success" : "text-primary")} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{task.title}</h3>
                          {task.completed && <CheckCircle2 className="h-4 w-4 text-success" />}
                        </div>
                        <p className="text-sm font-semibold text-primary">+${task.reward.toFixed(2)} USDT</p>
                      </div>
                      <Button
                        size="sm"
                        variant={task.completed ? "secondary" : "default"}
                        className={cn(!task.completed && "primary-gradient")}
                        disabled={task.completed || completingTask === task.id}
                        onClick={() => handleStartTask(task)}
                      >
                        {task.completed ? "Done" : completingTask === task.id ? "..." : "Start"}
                        {!task.completed && completingTask !== task.id && <ExternalLink className="ml-1 h-3 w-3" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Spin Tab */}
        <TabsContent value="spin" className="mt-4">
          <Card className="glass-card overflow-hidden">
            <CardContent className="flex flex-col items-center p-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Lucky Wheel</h2>
              <p className="text-sm text-muted-foreground mb-6">Spin to win up to $10 USDT!</p>

              <div className="relative mb-6">
                <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30 blur-xl animate-pulse" />
                <div className="absolute -inset-4 rounded-full border-4 border-amber-400/50" style={{ boxShadow: "0 0 20px rgba(251, 191, 36, 0.4), inset 0 0 20px rgba(251, 191, 36, 0.1)" }}>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className={cn("absolute w-2.5 h-2.5 rounded-full", spinning ? i % 2 === 0 ? "bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.9)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]" : "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]")}
                      style={{ left: "50%", top: "50%", transform: `rotate(${i * 22.5}deg) translateY(-140px) translateX(-50%)` }} />
                  ))}
                </div>

                <div className="relative h-64 w-64 rounded-full transition-transform ease-out"
                  style={{ transform: `rotate(${rotation}deg)`, transitionDuration: spinning ? "4000ms" : "0ms", transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.12, 0.99)", boxShadow: "0 0 0 6px #1a1a2e, 0 0 0 8px rgba(251, 191, 36, 0.6), 0 0 30px rgba(251, 191, 36, 0.3), inset 0 0 30px rgba(0,0,0,0.3)" }}>
                  <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
                    {wheelPrizes.map((prize, i) => {
                      const colors = [
                        { bg: "#f43f5e", text: "#fff" }, { bg: "#1e1e32", text: "#fbbf24" },
                        { bg: "#10b981", text: "#fff" }, { bg: "#1e1e32", text: "#fbbf24" },
                        { bg: "#f59e0b", text: "#fff" }, { bg: "#1e1e32", text: "#fbbf24" },
                        { bg: "#8b5cf6", text: "#fff" }, { bg: "#1e1e32", text: "#fbbf24" },
                      ]
                      const angle = i * 45
                      const startAngle = (angle - 90) * Math.PI / 180
                      const endAngle = (angle + 45 - 90) * Math.PI / 180
                      const x1 = 100 + 100 * Math.cos(startAngle), y1 = 100 + 100 * Math.sin(startAngle)
                      const x2 = 100 + 100 * Math.cos(endAngle), y2 = 100 + 100 * Math.sin(endAngle)
                      const textAngle = angle + 22.5
                      const textX = 100 + 65 * Math.cos((textAngle - 90) * Math.PI / 180)
                      const textY = 100 + 65 * Math.sin((textAngle - 90) * Math.PI / 180)
                      return (
                        <g key={i}>
                          <path d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`} fill={colors[i].bg} stroke="#2a2a4a" strokeWidth="1" />
                          <text x={textX} y={textY} fill={colors[i].text} fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textAngle}, ${textX}, ${textY})`}>{prize}</text>
                        </g>
                      )
                    })}
                  </svg>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center" style={{ boxShadow: "0 4px 15px rgba(251, 191, 36, 0.5)" }}>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center">
                      <span className="text-amber-900 font-bold text-xs">SPIN</span>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20">
                  <div className="w-0 h-0" style={{ borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "28px solid #fbbf24", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }} />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Gift className="h-5 w-5 text-amber-400" />
                <span className="text-sm text-muted-foreground">{spinsRemaining} spins remaining today</span>
              </div>

              <Button
                onClick={handleSpin}
                disabled={spinning || spinsRemaining <= 0}
                className="h-12 w-full text-lg font-semibold bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-amber-950 shadow-lg shadow-amber-500/30"
              >
                {spinning ? "Spinning..." : spinsRemaining <= 0 ? "No Spins Left" : "Spin Now"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Watching Dialog */}
      <Dialog open={!!watchingVideo} onOpenChange={(open) => !open && closeVideoDialog()}>
        <DialogContent className="glass-card border-primary/20 p-0 max-w-md overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Watching Video</DialogTitle>
            <DialogDescription>Watch the full video to earn your reward</DialogDescription>
          </DialogHeader>
          {watchingVideo && (
            <>
              <div className={cn("relative aspect-video w-full", watchingVideo.thumbnail)}>
                <button onClick={closeVideoDialog} className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
                  <X className="h-5 w-5 text-white" />
                </button>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {showReward ? (
                    <div className="text-center animate-in zoom-in duration-300">
                      <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4 mx-auto">
                        <CheckCircle2 className="h-12 w-12 text-green-400" />
                      </div>
                      <p className="text-2xl font-bold text-white mb-1">Reward Earned!</p>
                      <p className="text-3xl font-bold text-green-400">+${earnedAmount.toFixed(2)} USDT</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-16 w-16 rounded-full bg-black/30 flex items-center justify-center mb-4">
                        <Play className="h-8 w-8 text-white" fill="white" />
                      </div>
                      <p className="text-white font-medium text-lg">{watchingVideo.title}</p>
                      <p className="text-white/70 text-sm mt-1">Ad playing...</p>
                    </>
                  )}
                </div>
                <button onClick={() => setIsMuted(!isMuted)} className="absolute bottom-3 left-3 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
                  {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
                </button>
                {!showReward && (
                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/70 text-white text-sm font-medium">{formatTime(timeRemaining)}</div>
                )}
              </div>
              {!showReward && (
                <div className="p-4">
                  <Progress value={((watchingVideo.duration - timeRemaining) / watchingVideo.duration) * 100} className="h-2" />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Reward: +${watchingVideo.reward.toFixed(2)} USDT</span>
                    <span className="text-xs text-muted-foreground">{formatTime(timeRemaining)} remaining</span>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Prize Won Dialog */}
      <Dialog open={showPrizeDialog} onOpenChange={setShowPrizeDialog}>
        <DialogContent className="glass-card border-primary/20 text-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Prize Won</DialogTitle>
            <DialogDescription>You won a prize from the lucky wheel</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4 animate-bounce">
              <Gift className="h-12 w-12 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Congratulations!</h2>
            <p className="text-4xl font-bold text-green-400 mb-2">{wonPrize}</p>
            <p className="text-sm text-muted-foreground">has been added to your balance</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Completed Dialog */}
      <Dialog open={taskCompletedDialog} onOpenChange={setTaskCompletedDialog}>
        <DialogContent className="glass-card border-primary/20 text-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Task Completed</DialogTitle>
            <DialogDescription>You have successfully completed a task</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Task Completed!</h2>
            <p className="text-3xl font-bold text-green-400">+${completedTaskReward.toFixed(2)} USDT</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
