"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
  Wallet,
  TrendingUp,
  PlayCircle,
  Menu,
  Home,
  DollarSign,
  Settings,
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  RefreshCw,
  Trash2,
  UserCheck,
  AlertTriangle,
  Lock,
  LogOut,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Types
interface User {
  id: number
  name: string
  email: string
  balance: number
  referrals: number
  status: "active" | "suspended"
  vip: number
  joinDate: string
  totalEarnings: number
  videosWatched: number
}

interface Withdrawal {
  id: number
  userId: number
  user: string
  amount: number
  address: string
  status: "pending" | "approved" | "rejected"
  date: string
  processedAt?: string
}

interface AppSettings {
  minWithdrawal: number
  dailyVideoLimit: number
  referralCommission: number
  rewardPerVideo: number
  maxDailyEarnings: number
  cooldownSeconds: number
  minWatchPercent: number
  vipMultiplier: number
}

const initialSettings: AppSettings = {
  minWithdrawal: 10,
  dailyVideoLimit: 50,
  referralCommission: 15,
  rewardPerVideo: 0.05,
  maxDailyEarnings: 25,
  cooldownSeconds: 30,
  minWatchPercent: 90,
  vipMultiplier: 1.5,
}

const sidebarItems = [
  { icon: Home, label: "Dashboard", id: "dashboard" },
  { icon: Users, label: "Users", id: "users" },
  { icon: DollarSign, label: "Withdrawals", id: "withdrawals" },
  { icon: BarChart3, label: "Analytics", id: "analytics" },
  { icon: PlayCircle, label: "Ads", id: "ads" },
  { icon: PlayCircle, label: "Ad Networks", id: "adnetworks" },
  { icon: Settings, label: "Settings", id: "settings" },
]

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error", message: string } | null>(null)

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // Check auth on mount
  useEffect(() => {
    fetch("/api/admin/verify")
      .then(r => r.json())
      .then(d => setIsAuthenticated(d.authenticated === true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setAuthLoading(false))
  }, [])

  // Load real data from Supabase when authenticated
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [usersRes, withdrawalsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/withdrawals"),
      ])
      const usersData = await usersRes.json()
      const withdrawalsData = await withdrawalsRes.json()
      if (usersData.users) setUsers(usersData.users)
      if (withdrawalsData.withdrawals) setWithdrawals(withdrawalsData.withdrawals)
    } catch {}
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated, loadData])

  // Show notification
  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setIsAuthenticated(true)
        setLoginPassword("")
      } else {
        setLoginError(data.error || "Invalid password")
      }
    } catch {
      setLoginError("Connection error. Try again.")
    }
    setLoginLoading(false)
  }

  // Logout handler
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    setIsAuthenticated(false)
    setUsers([])
    setWithdrawals([])
  }

  // User actions (API-backed)
  const toggleUserStatus = useCallback((userId: number) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, status: user.status === "active" ? "suspended" : "active" }
        : user
    ))
    showNotification("success", "User status updated")
  }, [showNotification])

  const updateUserBalance = useCallback(async (userId: number, newBalance: number) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "updateBalance", balance: newBalance }),
    })
    setUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, balance: newBalance } : user
    ))
    showNotification("success", "User balance updated")
  }, [showNotification])

  const deleteUser = useCallback(async (userId: number) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "delete" }),
    })
    setUsers(prev => prev.filter(user => user.id !== userId))
    setWithdrawals(prev => prev.filter(w => w.userId !== userId))
    showNotification("success", "User deleted successfully")
  }, [showNotification])

  // Withdrawal actions (API-backed)
  const approveWithdrawal = useCallback(async (withdrawalId: number) => {
    const w = withdrawals.find(x => x.id === withdrawalId)
    await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txId: w?.id, action: "approve" }),
    })
    setWithdrawals(prev => prev.map(w =>
      w.id === withdrawalId
        ? { ...w, status: "approved", processedAt: new Date().toISOString().slice(0, 16).replace("T", " ") }
        : w
    ))
    showNotification("success", "Withdrawal approved")
  }, [showNotification, withdrawals])

  const rejectWithdrawal = useCallback(async (withdrawalId: number) => {
    const w = withdrawals.find(x => x.id === withdrawalId)
    await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txId: w?.id, action: "reject" }),
    })
    setWithdrawals(prev => prev.map(w =>
      w.id === withdrawalId
        ? { ...w, status: "rejected", processedAt: new Date().toISOString().slice(0, 16).replace("T", " ") }
        : w
    ))
    showNotification("success", "Withdrawal rejected and amount refunded")
  }, [showNotification, withdrawals])

  // Settings
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
    showNotification("success", "Settings saved successfully")
  }, [showNotification])

  const refreshData = useCallback(() => {
    loadData().then(() => showNotification("success", "Data refreshed"))
  }, [loadData, showNotification])

  // Stats
  const stats = [
    { label: "Total Users", value: users.length.toLocaleString(), change: "", icon: Users, trend: "up" },
    { label: "Active Users", value: users.filter(u => u.status === "active").length.toLocaleString(), change: "", icon: TrendingUp, trend: "up" },
    { label: "Total Payouts", value: `$${withdrawals.filter(w => w.status === "approved").reduce((sum, w) => sum + w.amount, 0).toFixed(2)}`, change: "", icon: Wallet, trend: "up" },
    { label: "Pending", value: withdrawals.filter(w => w.status === "pending").length.toLocaleString(), change: "", icon: PlayCircle, trend: "up" },
  ]

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gradient">GoldenTask</h1>
            <p className="mt-1 text-sm text-muted-foreground">Admin Panel</p>
          </div>
          <Card className="glass-card">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter admin password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="bg-secondary/50"
                    autoFocus
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {loginError}
                  </p>
                )}
                <Button
                  type="submit"
                  className="primary-gradient w-full"
                  disabled={loginLoading || !loginPassword}
                >
                  {loginLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Notification */}
      {notification && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2",
          notification.type === "success" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
        )}>
          {notification.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {sidebarOpen && (
            <h1 className="text-lg font-bold text-gradient">GoldenTask</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <nav className="mt-4 px-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 mb-1 transition-all",
                  activeSection === item.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6">
          <h2 className="text-xl font-semibold text-foreground capitalize">{activeSection}</h2>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
            <Avatar className="h-9 w-9 ring-2 ring-primary/50">
              <AvatarFallback className="bg-primary text-primary-foreground">A</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {activeSection === "dashboard" && <DashboardContent stats={stats} withdrawals={withdrawals} />}
          {activeSection === "users" && (
            <UsersContent 
              users={users} 
              onToggleStatus={toggleUserStatus}
              onUpdateBalance={updateUserBalance}
              onDeleteUser={deleteUser}
            />
          )}
          {activeSection === "withdrawals" && (
            <WithdrawalsContent 
              withdrawals={withdrawals}
              onApprove={approveWithdrawal}
              onReject={rejectWithdrawal}
            />
          )}
          {activeSection === "analytics" && <AnalyticsContent users={users} withdrawals={withdrawals} />}
          {activeSection === "ads" && <AdsContent />}
          {activeSection === "adnetworks" && <AdNetworksContent />}
          {activeSection === "settings" && <SettingsContent settings={settings} onUpdateSettings={updateSettings} onChangePassword={async (cur, nw) => {
            const res = await fetch("/api/admin/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: cur, newPassword: nw }) })
            const d = await res.json()
            if (d.success) { showNotification("success", "Password changed successfully"); return { ok: true } }
            if (d.error === "setup_required") return { ok: false, sql: d.sql }
            showNotification("error", d.error || "Failed to change password")
            return { ok: false }
          }} />}
        </div>
      </main>
    </div>
  )
}

function DashboardContent({ stats, withdrawals }: { stats: { label: string; value: string; change: string; icon: typeof Users; trend: string }[], withdrawals: Withdrawal[] }) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="glass-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-1 text-sm text-success">{stat.change}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mr-3 opacity-50" />
              <span>Revenue chart placeholder</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mr-3 opacity-50" />
              <span>Growth chart placeholder</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recent Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.slice(0, 3).map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.user}</TableCell>
                  <TableCell>${w.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        w.status === "approved" && "border-success text-success",
                        w.status === "pending" && "border-primary text-primary",
                        w.status === "rejected" && "border-destructive text-destructive"
                      )}
                    >
                      {w.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{w.date}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

interface UsersContentProps {
  users: User[]
  onToggleStatus: (userId: number) => void
  onUpdateBalance: (userId: number, balance: number) => void
  onDeleteUser: (userId: number) => void
}

function UsersContent({ users, onToggleStatus, onUpdateBalance, onDeleteUser }: UsersContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editBalance, setEditBalance] = useState("")

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDeleteConfirm = () => {
    if (selectedUser) {
      onDeleteUser(selectedUser.id)
      setShowDeleteDialog(false)
      setSelectedUser(null)
    }
  }

  const handleEditSave = () => {
    if (selectedUser && editBalance) {
      onUpdateBalance(selectedUser.id, parseFloat(editBalance))
      setShowEditDialog(false)
      setSelectedUser(null)
      setEditBalance("")
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-10 bg-secondary/50" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-secondary/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-secondary">
                          {user.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">${user.balance.toFixed(2)}</TableCell>
                  <TableCell>{user.referrals}</TableCell>
                  <TableCell>
                    <Badge className="primary-gradient border-0">VIP {user.vip}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        user.status === "active" && "border-success text-success",
                        user.status === "suspended" && "border-destructive text-destructive"
                      )}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(user)
                          setEditBalance(user.balance.toString())
                          setShowEditDialog(true)
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          Edit Balance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(user.id)}>
                          {user.status === "active" ? (
                            <>
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone and will remove all their data including withdrawal history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Balance Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Balance</DialogTitle>
            <DialogDescription>
              Update balance for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">New Balance (USDT)</label>
            <Input 
              type="number" 
              value={editBalance}
              onChange={(e) => setEditBalance(e.target.value)}
              className="mt-2"
              step="0.01"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="primary-gradient" onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface WithdrawalsContentProps {
  withdrawals: Withdrawal[]
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

function WithdrawalsContent({ withdrawals, onApprove, onReject }: WithdrawalsContentProps) {
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending")
  const approvedWithdrawals = withdrawals.filter(w => w.status === "approved")
  const rejectedWithdrawals = withdrawals.filter(w => w.status === "rejected")

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="pending">Pending ({pendingWithdrawals.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedWithdrawals.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedWithdrawals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-0">
              {pendingWithdrawals.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No pending withdrawals
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.user}</TableCell>
                        <TableCell>${w.amount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{w.address}</TableCell>
                        <TableCell className="text-muted-foreground">{w.date}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="primary-gradient" onClick={() => onApprove(w.id)}>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => onReject(w.id)}>
                              <XCircle className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-0">
              {approvedWithdrawals.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No approved withdrawals
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedWithdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.user}</TableCell>
                        <TableCell className="text-success">${w.amount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{w.address}</TableCell>
                        <TableCell className="text-muted-foreground">{w.date}</TableCell>
                        <TableCell className="text-muted-foreground">{w.processedAt || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-0">
              {rejectedWithdrawals.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No rejected withdrawals
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Rejected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedWithdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.user}</TableCell>
                        <TableCell className="text-destructive">${w.amount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{w.address}</TableCell>
                        <TableCell className="text-muted-foreground">{w.date}</TableCell>
                        <TableCell className="text-muted-foreground">{w.processedAt || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AnalyticsContent({ users, withdrawals }: { users: User[], withdrawals: Withdrawal[] }) {
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === "active").length
  const totalEarnings = users.reduce((sum, u) => sum + u.totalEarnings, 0)
  const totalVideos = users.reduce((sum, u) => sum + u.videosWatched, 0)
  const totalPayouts = withdrawals.filter(w => w.status === "approved").reduce((sum, w) => sum + w.amount, 0)
  const avgBalancePerUser = users.length > 0 ? users.reduce((sum, u) => sum + u.balance, 0) / users.length : 0

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
            <p className="text-xs text-success mt-1">{activeUsers} active</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Videos Watched</p>
            <p className="text-3xl font-bold text-foreground">{totalVideos.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Payouts</p>
            <p className="text-3xl font-bold text-success">${totalPayouts.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{withdrawals.filter(w => w.status === "approved").length} transactions</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Avg Balance/User</p>
            <p className="text-3xl font-bold text-foreground">${avgBalancePerUser.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Current balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Daily Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mr-3 opacity-50" />
              <span>DAU chart placeholder</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mr-3 opacity-50" />
              <span>Revenue chart placeholder</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Top Earners</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Videos Watched</TableHead>
                <TableHead>Total Earnings</TableHead>
                <TableHead>VIP Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .sort((a, b) => b.totalEarnings - a.totalEarnings)
                .slice(0, 5)
                .map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-bold text-primary">#{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-xs">
                            {user.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.videosWatched.toLocaleString()}</TableCell>
                    <TableCell className="text-success">${user.totalEarnings.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className="primary-gradient border-0">VIP {user.vip}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function AdsContent() {
  const ads = [
    { id: 1, name: "Crypto Exchange Pro", impressions: "45.2K", clicks: "2.3K", revenue: "$1,240", status: "active" },
    { id: 2, name: "DeFi Wallet Ad", impressions: "32.8K", clicks: "1.8K", revenue: "$890", status: "active" },
    { id: 3, name: "NFT Marketplace", impressions: "28.1K", clicks: "1.2K", revenue: "$650", status: "paused" },
    { id: 4, name: "Trading Course", impressions: "19.5K", clicks: "0.9K", revenue: "$420", status: "active" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ad Campaigns</h3>
          <p className="text-sm text-muted-foreground">Manage your advertising campaigns</p>
        </div>
        <Button className="primary-gradient">+ Add Campaign</Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell className="font-medium">{ad.name}</TableCell>
                  <TableCell>{ad.impressions}</TableCell>
                  <TableCell>{ad.clicks}</TableCell>
                  <TableCell className="text-success">{ad.revenue}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        ad.status === "active" && "border-success text-success",
                        ad.status === "paused" && "border-primary text-primary"
                      )}
                    >
                      {ad.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

interface SettingsContentProps {
  settings: AppSettings
  onUpdateSettings: (settings: Partial<AppSettings>) => void
  onChangePassword: (current: string, newPass: string) => Promise<{ ok: boolean; sql?: string }>
}

function SettingsContent({ settings, onUpdateSettings, onChangePassword }: SettingsContentProps) {
  const [localSettings, setLocalSettings] = useState(settings)
  const [nowPaymentsStatus, setNowPaymentsStatus] = useState<"connected" | "disconnected">("disconnected")
  const [etherscanStatus, setEtherscanStatus] = useState<"connected" | "disconnected">("disconnected")
  const [bscscanStatus, setBscscanStatus] = useState<"connected" | "disconnected">("disconnected")
  const [isSaving, setIsSaving] = useState(false)
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdError, setPwdError] = useState("")
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdSetupSql, setPwdSetupSql] = useState<string | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError("")
    setPwdSuccess(false)
    setPwdSetupSql(null)
    if (newPwd.length < 8) { setPwdError("New password must be at least 8 characters"); return }
    if (newPwd !== confirmPwd) { setPwdError("Passwords do not match"); return }
    setPwdSaving(true)
    const result = await onChangePassword(currentPwd, newPwd)
    setPwdSaving(false)
    if (result.ok) {
      setPwdSuccess(true)
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
    } else if (result.sql) {
      setPwdSetupSql(result.sql)
    } else {
      setPwdError("Failed — check your current password")
    }
  }

  const handleSaveGeneral = () => {
    setIsSaving(true)
    setTimeout(() => {
      onUpdateSettings({
        minWithdrawal: localSettings.minWithdrawal,
        dailyVideoLimit: localSettings.dailyVideoLimit,
        referralCommission: localSettings.referralCommission,
      })
      setIsSaving(false)
    }, 500)
  }

  const handleSaveRewards = () => {
    setIsSaving(true)
    setTimeout(() => {
      onUpdateSettings({
        rewardPerVideo: localSettings.rewardPerVideo,
        maxDailyEarnings: localSettings.maxDailyEarnings,
        cooldownSeconds: localSettings.cooldownSeconds,
        minWatchPercent: localSettings.minWatchPercent,
        vipMultiplier: localSettings.vipMultiplier,
      })
      setIsSaving(false)
    }, 500)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Change Password */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Change Admin Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Current Password</label>
              <Input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className="bg-secondary/50" placeholder="Enter current password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="bg-secondary/50" placeholder="Minimum 8 characters" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm New Password</label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="bg-secondary/50" placeholder="Repeat new password" />
            </div>
            {pwdError && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{pwdError}</p>}
            {pwdSuccess && <p className="text-sm text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Password changed successfully!</p>}
            {pwdSetupSql && (
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 space-y-2">
                <p className="text-sm font-medium text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Database table missing. Run this SQL in your Supabase SQL Editor, then try again:
                </p>
                <pre className="text-xs bg-secondary/80 p-3 rounded overflow-auto text-foreground whitespace-pre-wrap">{pwdSetupSql}</pre>
                <Button size="sm" variant="outline" type="button" onClick={() => navigator.clipboard.writeText(pwdSetupSql)}>
                  Copy SQL
                </Button>
              </div>
            )}
            <Button type="submit" className="primary-gradient" disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}>
              {pwdSaving ? "Saving..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Minimum Withdrawal (USDT)</label>
            <Input 
              type="number"
              value={localSettings.minWithdrawal}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, minWithdrawal: parseFloat(e.target.value) || 0 }))}
              className="bg-secondary/50" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Daily Video Limit</label>
            <Input 
              type="number"
              value={localSettings.dailyVideoLimit}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, dailyVideoLimit: parseInt(e.target.value) || 0 }))}
              className="bg-secondary/50" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Referral Commission Rate (%)</label>
            <Input 
              type="number"
              value={localSettings.referralCommission}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, referralCommission: parseFloat(e.target.value) || 0 }))}
              className="bg-secondary/50" 
            />
          </div>
          <Button className="primary-gradient" onClick={handleSaveGeneral} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Reward Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reward per Video (USDT)</label>
              <Input 
                type="number"
                step="0.01"
                value={localSettings.rewardPerVideo}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, rewardPerVideo: parseFloat(e.target.value) || 0 }))}
                className="bg-secondary/50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Max Daily Earnings (USDT)</label>
              <Input 
                type="number"
                value={localSettings.maxDailyEarnings}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, maxDailyEarnings: parseFloat(e.target.value) || 0 }))}
                className="bg-secondary/50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cooldown Between Videos (sec)</label>
              <Input 
                type="number"
                value={localSettings.cooldownSeconds}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, cooldownSeconds: parseInt(e.target.value) || 0 }))}
                className="bg-secondary/50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Minimum Watch Time (%)</label>
              <Input 
                type="number"
                value={localSettings.minWatchPercent}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, minWatchPercent: parseInt(e.target.value) || 0 }))}
                className="bg-secondary/50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">VIP Bonus Multiplier</label>
              <Input 
                type="number"
                step="0.1"
                value={localSettings.vipMultiplier}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, vipMultiplier: parseFloat(e.target.value) || 1 }))}
                className="bg-secondary/50" 
              />
            </div>
          </div>
          <Button className="primary-gradient" onClick={handleSaveRewards} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Reward Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">USDT Hot Wallet Address</label>
            <Input defaultValue="TRC20..." className="bg-secondary/50 font-mono" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Auto-approve Threshold</label>
            <Input defaultValue="$50.00" className="bg-secondary/50" />
          </div>
          <Button className="primary-gradient">Save Changes</Button>
        </CardContent>
      </Card>

      {/* NOWPayments Integration */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">NOWPayments</CardTitle>
                <p className="text-xs text-muted-foreground">Crypto payment gateway for deposits & withdrawals</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                nowPaymentsStatus === "connected" && "border-success text-success",
                nowPaymentsStatus === "disconnected" && "border-muted-foreground text-muted-foreground"
              )}
            >
              {nowPaymentsStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">API Key</label>
            <Input placeholder="Enter your NOWPayments API key" className="bg-secondary/50 font-mono" type="password" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">IPN Secret Key</label>
            <Input placeholder="Enter your IPN secret key" className="bg-secondary/50 font-mono" type="password" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">IPN Callback URL</label>
            <Input defaultValue="https://yourapp.com/api/nowpayments/ipn" className="bg-secondary/50 font-mono text-sm" readOnly />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Default Currency</label>
              <Select defaultValue="USDT">
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="BNB">BNB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Environment</label>
              <Select defaultValue="sandbox">
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                  <SelectItem value="production">Production (Live)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="primary-gradient flex-1">
              {nowPaymentsStatus === "connected" ? "Update Configuration" : "Connect NOWPayments"}
            </Button>
            {nowPaymentsStatus === "connected" && (
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Etherscan Integration */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Etherscan API</CardTitle>
                <p className="text-xs text-muted-foreground">Track ERC20 transactions on Ethereum</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                etherscanStatus === "connected" && "border-success text-success",
                etherscanStatus === "disconnected" && "border-muted-foreground text-muted-foreground"
              )}
            >
              {etherscanStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Etherscan API Key</label>
            <Input placeholder="Enter your Etherscan API key" className="bg-secondary/50 font-mono" type="password" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">USDT Contract Address (ERC20)</label>
            <Input defaultValue="0xdAC17F958D2ee523a2206206994597C13D831ec7" className="bg-secondary/50 font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Wallet Address to Monitor</label>
            <Input placeholder="0x..." className="bg-secondary/50 font-mono" />
          </div>
          <div className="flex gap-2">
            <Button className="primary-gradient flex-1">
              {etherscanStatus === "connected" ? "Update Configuration" : "Connect Etherscan"}
            </Button>
            {etherscanStatus === "connected" && (
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BSCScan Integration */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                <Eye className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <CardTitle className="text-base">BSCScan API</CardTitle>
                <p className="text-xs text-muted-foreground">Track BEP20 transactions on BNB Chain</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                bscscanStatus === "connected" && "border-success text-success",
                bscscanStatus === "disconnected" && "border-muted-foreground text-muted-foreground"
              )}
            >
              {bscscanStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">BSCScan API Key</label>
            <Input placeholder="Enter your BSCScan API key" className="bg-secondary/50 font-mono" type="password" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">USDT Contract Address (BEP20)</label>
            <Input defaultValue="0x55d398326f99059fF775485246999027B3197955" className="bg-secondary/50 font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Wallet Address to Monitor</label>
            <Input placeholder="0x..." className="bg-secondary/50 font-mono" />
          </div>
          <div className="flex gap-2">
            <Button className="primary-gradient flex-1">
              {bscscanStatus === "connected" ? "Update Configuration" : "Connect BSCScan"}
            </Button>
            {bscscanStatus === "connected" && (
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Status Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>API Integrations Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="font-medium text-foreground">NOWPayments</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Deposits & Withdrawals</span>
                <Badge variant="outline" className={nowPaymentsStatus === "connected" ? "border-success text-success" : "border-muted-foreground text-muted-foreground"}>
                  {nowPaymentsStatus}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                  <Eye className="h-4 w-4 text-blue-500" />
                </div>
                <span className="font-medium text-foreground">Etherscan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ERC20 Tracking</span>
                <Badge variant="outline" className={etherscanStatus === "connected" ? "border-success text-success" : "border-muted-foreground text-muted-foreground"}>
                  {etherscanStatus}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
                  <Eye className="h-4 w-4 text-yellow-500" />
                </div>
                <span className="font-medium text-foreground">BSCScan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">BEP20 Tracking</span>
                <Badge variant="outline" className={bscscanStatus === "connected" ? "border-success text-success" : "border-muted-foreground text-muted-foreground"}>
                  {bscscanStatus}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AdNetworksContent() {
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null)
  const [networkStatuses, setNetworkStatuses] = useState<Record<string, boolean>>({})
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [setupSql, setSetupSql] = useState<string | null>(null)
  const [isLoadingNets, setIsLoadingNets] = useState(true)

  useEffect(() => {
    fetch("/api/admin/ad-networks")
      .then(r => r.json())
      .then(d => {
        if (d.configs) {
          const statuses: Record<string, boolean> = {}
          const values: Record<string, Record<string, string>> = {}
          for (const [id, cfg] of Object.entries(d.configs)) {
            statuses[id] = true
            values[id] = cfg as Record<string, string>
          }
          setNetworkStatuses(statuses)
          setFieldValues(values)
        }
        if (d.error === "setup_required") setSetupSql(d.sql)
      })
      .catch(() => {})
      .finally(() => setIsLoadingNets(false))
  }, [])

  const handleConnect = async (networkId: string) => {
    setSaving(networkId)
    const res = await fetch("/api/admin/ad-networks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ networkId, fields: fieldValues[networkId] || {}, connected: true }),
    })
    const d = await res.json()
    if (d.success) setNetworkStatuses(prev => ({ ...prev, [networkId]: true }))
    if (d.error === "setup_required") setSetupSql(d.sql)
    setSaving(null)
  }

  const handleDisconnect = async (networkId: string) => {
    setSaving(networkId)
    await fetch("/api/admin/ad-networks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ networkId, connected: false }),
    })
    setNetworkStatuses(prev => ({ ...prev, [networkId]: false }))
    setSaving(null)
  }

  const setField = (networkId: string, fieldKey: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [networkId]: { ...prev[networkId], [fieldKey]: value } }))
  }

  const adNetworks = [
    {
      id: "admob",
      name: "Google AdMob",
      logo: "🟢",
      description: "Rewarded video ads from Google",
      fields: [
        { key: "appId", label: "App ID", placeholder: "ca-app-pub-xxxxx~xxxxx" },
        { key: "rewardedUnitId", label: "Rewarded Ad Unit ID", placeholder: "ca-app-pub-xxxxx/xxxxx" },
        { key: "interstitialUnitId", label: "Interstitial Ad Unit ID", placeholder: "ca-app-pub-xxxxx/xxxxx" },
      ],
    },
    {
      id: "unity",
      name: "Unity Ads",
      logo: "🎮",
      description: "High eCPM rewarded video ads",
      fields: [
        { key: "gameId", label: "Game ID", placeholder: "1234567" },
        { key: "rewardedPlacementId", label: "Rewarded Placement ID", placeholder: "rewardedVideo" },
        { key: "interstitialPlacementId", label: "Interstitial Placement ID", placeholder: "video" },
      ],
    },
    {
      id: "applovin",
      name: "AppLovin MAX",
      logo: "🔷",
      description: "Mediation platform with high fill rate",
      fields: [
        { key: "sdkKey", label: "SDK Key", placeholder: "xxxxx-xxxxx-xxxxx" },
        { key: "rewardedAdUnitId", label: "Rewarded Ad Unit ID", placeholder: "xxxxx" },
        { key: "interstitialAdUnitId", label: "Interstitial Ad Unit ID", placeholder: "xxxxx" },
        { key: "bannerAdUnitId", label: "Banner Ad Unit ID", placeholder: "xxxxx" },
      ],
    },
    {
      id: "ironsource",
      name: "ironSource",
      logo: "🟠",
      description: "Full mediation with offerwall support",
      fields: [
        { key: "appKey", label: "App Key", placeholder: "xxxxxxx" },
        { key: "rewardedPlacementName", label: "Rewarded Placement Name", placeholder: "DefaultRewardedVideo" },
        { key: "offerwallPlacementName", label: "Offerwall Placement Name", placeholder: "DefaultOfferWall" },
      ],
    },
    {
      id: "facebook",
      name: "Meta Audience Network",
      logo: "🔵",
      description: "Facebook rewarded video ads",
      fields: [
        { key: "appId", label: "App ID", placeholder: "xxxxx" },
        { key: "rewardedPlacementId", label: "Rewarded Placement ID", placeholder: "xxxxx_xxxxx" },
        { key: "interstitialPlacementId", label: "Interstitial Placement ID", placeholder: "xxxxx_xxxxx" },
      ],
    },
    {
      id: "vungle",
      name: "Vungle",
      logo: "🟣",
      description: "Premium video ads network",
      fields: [
        { key: "appId", label: "App ID", placeholder: "xxxxx" },
        { key: "rewardedPlacementId", label: "Rewarded Placement ID", placeholder: "REWARDED-xxxxx" },
        { key: "interstitialPlacementId", label: "Interstitial Placement ID", placeholder: "INTER-xxxxx" },
      ],
    },
    {
      id: "chartboost",
      name: "Chartboost",
      logo: "📊",
      description: "Gaming-focused ad network",
      fields: [
        { key: "appId", label: "App ID", placeholder: "xxxxx" },
        { key: "appSignature", label: "App Signature", placeholder: "xxxxx" },
        { key: "rewardedLocation", label: "Rewarded Location", placeholder: "Default" },
      ],
    },
    {
      id: "mintegral",
      name: "Mintegral",
      logo: "🟡",
      description: "Global ad network with AI optimization",
      fields: [
        { key: "appId", label: "App ID", placeholder: "xxxxx" },
        { key: "appKey", label: "App Key", placeholder: "xxxxx" },
        { key: "rewardedUnitId", label: "Rewarded Unit ID", placeholder: "xxxxx" },
      ],
    },
    {
      id: "monetag",
      name: "Monetag",
      logo: "💰",
      description: "Multi-format ads: Push, Popunder, Interstitial",
      fields: [
        { key: "siteId", label: "Site ID", placeholder: "xxxxx" },
        { key: "pushZoneId", label: "Push Zone ID", placeholder: "xxxxx" },
        { key: "popunderZoneId", label: "Popunder Zone ID", placeholder: "xxxxx" },
        { key: "interstitialZoneId", label: "Interstitial Zone ID", placeholder: "xxxxx" },
        { key: "rewardedZoneId", label: "Rewarded Zone ID", placeholder: "xxxxx" },
      ],
    },
  ]

  const connectedCount = Object.values(networkStatuses).filter(Boolean).length

  return (
    <div className="space-y-6">
      {setupSql && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 space-y-2">
          <p className="text-sm font-medium text-warning flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Database table missing. Run this SQL in your Supabase SQL Editor to enable saving:
          </p>
          <pre className="text-xs bg-secondary/80 p-3 rounded overflow-auto text-foreground whitespace-pre-wrap">{setupSql}</pre>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(setupSql)}>
            Copy SQL
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ad Networks Integration</h3>
          <p className="text-sm text-muted-foreground">Connect your ad networks to monetize video views</p>
        </div>
        {isLoadingNets ? (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Loading...</Badge>
        ) : (
          <Badge variant="outline" className={connectedCount > 0 ? "border-success text-success" : "border-muted-foreground text-muted-foreground"}>
            {connectedCount} Connected
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {adNetworks.map((network) => {
          const isConnected = networkStatuses[network.id] ?? false
          return (
          <Card
            key={network.id}
            className={cn(
              "glass-card cursor-pointer transition-all hover:border-primary/50",
              activeNetwork === network.id && "border-primary ring-1 ring-primary/50"
            )}
            onClick={() => setActiveNetwork(activeNetwork === network.id ? null : network.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
                    {network.logo}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{network.name}</h4>
                    <p className="text-xs text-muted-foreground">{network.description}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    isConnected && "border-success text-success",
                    !isConnected && "border-muted-foreground text-muted-foreground"
                  )}
                >
                  {isConnected ? "connected" : "disconnected"}
                </Badge>
              </div>

              {activeNetwork === network.id && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {network.fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                      <Input
                        placeholder={field.placeholder}
                        value={fieldValues[network.id]?.[field.key] ?? ""}
                        onChange={(e) => { e.stopPropagation(); setField(network.id, field.key, e.target.value) }}
                        className="h-9 bg-secondary/50 font-mono text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="primary-gradient flex-1"
                      size="sm"
                      disabled={saving === network.id}
                      onClick={(e) => { e.stopPropagation(); handleConnect(network.id) }}
                    >
                      {saving === network.id ? "Saving..." : isConnected ? "Update" : "Connect"}
                    </Button>
                    {isConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        disabled={saving === network.id}
                        onClick={(e) => { e.stopPropagation(); handleDisconnect(network.id) }}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )
        })}
      </div>

      {/* Ad Priority Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Ad Mediation Priority</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Drag to reorder ad networks by priority. Higher priority networks will be called first.
          </p>
          <div className="space-y-2">
            {adNetworks
              .filter((n) => networkStatuses[n.id])
              .map((network, index) => (
                <div
                  key={network.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <span className="text-lg">{network.logo}</span>
                    <span className="font-medium text-foreground">{network.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="text-sm text-success">Connected</span>
                  </div>
                </div>
              ))}
            {connectedCount === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                No ad networks connected yet. Connect at least one network above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Limits Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Video Watch Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Control how many videos users can watch daily based on their VIP level
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">0</span>
                <div>
                  <p className="font-medium text-foreground">Free Users</p>
                  <p className="text-xs text-muted-foreground">No VIP subscription</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input defaultValue="20" className="w-20 bg-secondary/50 text-center" />
                <span className="text-sm text-muted-foreground">videos/day</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-lg text-primary">1</span>
                <div>
                  <p className="font-medium text-foreground">VIP Level 1</p>
                  <p className="text-xs text-muted-foreground">Bronze membership</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input defaultValue="50" className="w-20 bg-secondary/50 text-center" />
                <span className="text-sm text-muted-foreground">videos/day</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/30 text-lg text-primary">2</span>
                <div>
                  <p className="font-medium text-foreground">VIP Level 2</p>
                  <p className="text-xs text-muted-foreground">Silver membership</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input defaultValue="100" className="w-20 bg-secondary/50 text-center" />
                <span className="text-sm text-muted-foreground">videos/day</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary/50 bg-primary/10 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full primary-gradient text-lg text-background font-bold">3</span>
                <div>
                  <p className="font-medium text-foreground">VIP Level 3</p>
                  <p className="text-xs text-muted-foreground">Gold membership</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input defaultValue="200" className="w-20 bg-secondary/50 text-center" />
                <span className="text-sm text-muted-foreground">videos/day</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/20 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full primary-gradient text-lg text-background font-bold animate-pulse">4</span>
                <div>
                  <p className="font-medium text-foreground">VIP Level 4</p>
                  <p className="text-xs text-muted-foreground">Diamond membership</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input defaultValue="500" className="w-20 bg-secondary/50 text-center" />
                <span className="text-sm text-muted-foreground">videos/day</span>
              </div>
            </div>
          </div>
          <Button className="primary-gradient">Save Video Limits</Button>
        </CardContent>
      </Card>

      {/* Reward Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Reward Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reward per Video (USDT)</label>
              <Input defaultValue="0.05" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Max Daily Earnings (USDT)</label>
              <Input defaultValue="25.00" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cooldown Between Videos (sec)</label>
              <Input defaultValue="30" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Minimum Watch Time (%)</label>
              <Input defaultValue="90" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">VIP Bonus Multiplier</label>
              <Input defaultValue="1.5x" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reset Time (UTC)</label>
              <Input defaultValue="00:00" type="time" className="bg-secondary/50" />
            </div>
          </div>
          <Button className="primary-gradient">Save Reward Settings</Button>
        </CardContent>
      </Card>
    </div>
  )
}
