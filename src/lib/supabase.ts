import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  role: 'parent' | 'child'
  name: string
  child_name: string | null
  avatar: string | null
  points: number
  level: number
  streak: number
  theme_preference: 'space' | 'unicorn'
  active_outfit_id: string | null
  parent_pin: string | null
  family_pair_code: string | null
  linked_parent_id: string | null
  require_pin_for_tasks: boolean
  require_pin_for_rewards: boolean
}

export type Task = {
  id: string
  child_id: string
  title: string
  subject: string
  duration_mins: number
  point_value: number
  status: 'pending' | 'completed'
  completed_at: string | null
}

export type Reward = {
  id: string
  child_id: string
  title: string
  point_cost: number
  status: 'available' | 'claimed'
  claimed_at: string | null
}

export function generatePairCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'SP-'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
