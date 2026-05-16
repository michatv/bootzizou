import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { transport: undefined as any },
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          telegram_id: string
          username: string | null
          first_name: string | null
          last_name: string | null
          photo_url: string | null
          referral_code: string
          referred_by: string | null
          vip_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          telegram_id: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          photo_url?: string | null
          referral_code: string
          referred_by?: string | null
          vip_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          photo_url?: string | null
          vip_level?: number
          updated_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          balance: number
          total_earned: number
          total_withdrawn: number
          coins: number
          created_at: string
          updated_at: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: "earning" | "withdrawal" | "bonus" | "referral" | "spin"
          amount: number
          status: "pending" | "completed" | "failed"
          source: string | null
          address: string | null
          created_at: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          reward: number
          icon: string
          action_url: string | null
          type: "telegram" | "website" | "referral" | "checkin" | "video"
          is_active: boolean
          created_at: string
        }
      }
      user_tasks: {
        Row: {
          id: string
          user_id: string
          task_id: string
          completed: boolean
          progress: number
          completed_at: string | null
          created_at: string
        }
      }
      spin_history: {
        Row: {
          id: string
          user_id: string
          prize: number
          created_at: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          earnings: number
          created_at: string
        }
      }
    }
  }
}
