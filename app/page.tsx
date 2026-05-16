"use client"

import { useState } from "react"
import { Home, Coins, Wallet, Users, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { HomeScreen } from "@/components/screens/home-screen"
import { EarnScreen } from "@/components/screens/earn-screen"
import { WalletScreen } from "@/components/screens/wallet-screen"
import { ReferralsScreen } from "@/components/screens/referrals-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"

type Tab = "home" | "earn" | "wallet" | "referrals" | "profile"

const tabs = [
  { id: "home" as Tab, label: "Home", icon: Home },
  { id: "earn" as Tab, label: "Earn", icon: Coins },
  { id: "wallet" as Tab, label: "Wallet", icon: Wallet },
  { id: "referrals" as Tab, label: "Referrals", icon: Users },
  { id: "profile" as Tab, label: "Profile", icon: User },
]

export default function GoldenTaskApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [walletAction, setWalletAction] = useState<"deposit" | "withdraw" | null>(null)

  const navigateToDeposit = () => {
    setWalletAction("deposit")
    setActiveTab("wallet")
  }

  const navigateToTab = (tab: Tab) => {
    setActiveTab(tab)
  }

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen onNavigateToEarn={() => navigateToTab("earn")} />
      case "earn":
        return <EarnScreen />
      case "wallet":
        return <WalletScreen initialAction={walletAction} onActionHandled={() => setWalletAction(null)} />
      case "referrals":
        return <ReferralsScreen />
      case "profile":
        return <ProfileScreen onNavigateToDeposit={navigateToDeposit} />
      default:
        return <HomeScreen onNavigateToEarn={() => navigateToTab("earn")} />
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {renderScreen()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card safe-area-bottom">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-300",
                  isActive
                    ? "text-primary primary-glow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
