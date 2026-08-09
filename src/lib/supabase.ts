import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TaskApprovalMode = 'off' | 'in_person_pin' | 'remote_notification'
export type ProgressDisplayMode = 'percentage' | 'task_count' | 'theme_gauge'

export const ALL_SUBJECTS = ['Math', 'Reading', 'Science', 'History', 'Foreign Languages', 'Art'] as const
export type Subject = typeof ALL_SUBJECTS[number]

export type Profile = {
  id: string
  role: 'parent' | 'child'
  name: string
  child_name: string | null
  avatar: string | null
  points: number
  level: number
  streak: number
  gender: string | null
  theme_preference: 'space' | 'unicorn'
  active_outfit_id: string | null
  parent_pin: string | null
  family_pair_code: string | null
  linked_parent_id: string | null
  require_pin_for_tasks: boolean
  require_pin_for_rewards: boolean
  task_approval_mode: TaskApprovalMode
  progress_display_mode: ProgressDisplayMode
  active_subjects: string[] | null
  daily_cutoff_time: string
  auto_archive_daily: boolean
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

export type ApprovalRequest = {
  id: string
  child_id: string
  parent_id: string
  task_id: string | null
  task_title: string
  point_value: number
  status: 'pending' | 'approved' | 'denied'
  created_at: string
  resolved_at: string | null
}

export function generatePairCode(): string {
  const digits = '0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }
  return code
}
