import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})

export type Profile = {
  id: string
  name: string
  role: 'child' | 'parent'
  age: number | null
  avatar: string
  points: number
  level: number
  streak: number
  streak_active_days: number
  badges_earned: number
  gender: 'boy' | 'girl' | null
  parent_pin: string | null
  created_at: string
  // New personalization columns
  child_name: string | null
  grade: string | null
  photo_url: string | null
  theme_preference: 'space' | 'unicorn'
  active_outfit_id: string | null
  require_pin_for_tasks: boolean
  require_pin_for_rewards: boolean
}

export type Task = {
  id: string
  child_id: string
  subject: string
  title: string
  icon_name: string
  duration_mins: number
  points_value: number
  status: 'pending' | 'completed'
  due_date: string
  completed_at: string | null
  created_at: string
}

export type Reward = {
  id: string
  child_id: string
  title: string
  point_cost: number
  icon_name: string
  status: 'locked' | 'claimed' | 'approved' | 'declined'
  claimed_at: string | null
  created_at: string
}

export type StudySession = {
  id: string
  child_id: string
  task_id: string | null
  subject: string
  duration_mins: number
  completed_at: string
}

export type Outfit = {
  id: string
  title: string
  icon_url: string
  point_cost: number
  theme: 'space' | 'unicorn' | 'any'
  created_at: string
}

export type ChildOutfit = {
  id: string
  child_id: string
  outfit_id: string
  is_unlocked: boolean
  unlocked_at: string | null
}

export type OutfitWithUnlock = Outfit & {
  is_unlocked: boolean
  is_equipped: boolean
}

// ── Storage helpers ──────────────────────────────

export async function uploadAvatarPhoto(childId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${childId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) {
    console.error('Upload error:', error.message)
    return null
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
