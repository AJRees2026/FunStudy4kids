import type { Profile, Outfit } from '../lib/supabase'

export type Theme = {
  name: 'space' | 'unicorn'
  bg: string
  headerBg: string
  cardBg: string
  accent: string
  accentText: string
  accentBg: string
  starLabel: string
  starIcon: string
  ring: string
  emoji: string
  streakBg: string
}

export const THEMES: Record<'space' | 'unicorn', Theme> = {
  space: {
    name: 'space',
    bg: 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900',
    headerBg: 'bg-slate-900/80',
    cardBg: 'bg-slate-800/80',
    accent: 'text-cyan-400',
    accentText: 'text-cyan-300',
    accentBg: 'bg-cyan-500',
    starLabel: 'Fuel Cells',
    starIcon: '🔋',
    ring: 'ring-cyan-400',
    emoji: '🚀',
    streakBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
  },
  unicorn: {
    name: 'unicorn',
    bg: 'bg-gradient-to-b from-rose-200 via-fuchsia-100 to-indigo-200',
    headerBg: 'bg-white/70',
    cardBg: 'bg-white/80',
    accent: 'text-rose-500',
    accentText: 'text-rose-600',
    accentBg: 'bg-rose-400',
    starLabel: 'Star Points',
    starIcon: '⭐',
    ring: 'ring-rose-400',
    emoji: '🦄',
    streakBg: 'bg-gradient-to-r from-rose-400 to-fuchsia-400',
  },
}

export function getTheme(profile: Profile): Theme {
  return THEMES[profile.theme_preference] || THEMES.space
}

export function getOutfit(outfits: Outfit[], outfitId: string | null): Outfit | null {
  if (!outfitId) return null
  return outfits.find((o) => o.id === outfitId) || null
}
