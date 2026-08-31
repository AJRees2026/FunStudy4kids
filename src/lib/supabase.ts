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
  photo_url: string | null
  grade: string | null
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
  language: string
  writing_rank: WritingRank | null
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

export type Task = {
  id: string
  child_id: string
  title: string
  subject: string
  duration_mins: number
  point_value: number
  status: 'pending' | 'completed'
  completed_at: string | null
  reward_id: string | null
  created_at: string
}

export type Reward = {
  id: string
  child_id: string
  title: string
  point_cost: number
  status: 'available' | 'claimed'
  claimed_at: string | null
}

export type BookStatus = 'want_to_read' | 'in_progress' | 'completed'

export type Book = {
  id: string
  child_id: string
  title: string
  author: string
  total_pages: number
  current_page: number
  isbn: string | null
  cover_url: string | null
  status: BookStatus
  start_date: string | null
  completion_date: string | null
  created_at: string
  updated_at: string
}

export type MoodType = 'fantastic' | 'good' | 'okay' | 'sad' | 'frustrated'

export type MoodEntry = {
  id: string
  child_id: string
  entry_date: string
  mood: MoodType
  note: string | null
  created_at: string
  updated_at: string
}

export type GrowthEntry = {
  id: string
  child_id: string
  recorded_at: string
  height_cm: number | null
  weight_kg: number | null
  notes: string | null
  created_at: string
}

export type ReflectionStatus = 'draft' | 'approved'
export type EditRequestStatus = 'pending' | 'approved' | 'denied'

export type BookReflection = {
  id: string
  child_id: string
  book_title: string
  character: string | null
  genre: string | null
  start_date: string | null
  end_date: string | null
  reflection_text: string
  word_count: number
  status: ReflectionStatus
  allow_guardian_edit: boolean
  edit_request_status: EditRequestStatus | null
  created_at: string
  updated_at: string
}

export type WritingRank = 'junior_author' | 'storyteller' | 'master_storyteller' | 'master_wordsmith' | 'grand_chronicler' | 'epic_author'

export const WRITING_MILESTONES: { threshold: number; rank: WritingRank; points: number }[] = [
  { threshold: 50, rank: 'junior_author', points: 5 },
  { threshold: 200, rank: 'storyteller', points: 5 },
  { threshold: 500, rank: 'master_storyteller', points: 8 },
  { threshold: 1000, rank: 'master_wordsmith', points: 8 },
  { threshold: 2500, rank: 'grand_chronicler', points: 10 },
  { threshold: 5000, rank: 'epic_author', points: 10 },
]

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
