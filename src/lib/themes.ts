export type Theme = {
  name: string
  bg: string
  bgGradient: string
  cardBg: string
  cardBorder: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accent: string
  accentLight: string
  accentGradient: string
  starLabel: string
  emoji: string
  buttonGradient: string
}

export const spaceTheme: Theme = {
  name: 'space',
  bg: 'bg-boy-primary',
  bg: 'bg-boy-secondary'
  bgGradient: 'bg-gradient-to-r from-[#1034A6] to-[#F97316]',
  cardBg: 'bg-slate-800/80',
  cardBorder: 'border-slate-700',
  textPrimary: 'text-white',
  textSecondary: 'text-slate-300',
  textMuted: 'text-slate-400',
  accent: 'text-indigo-400',
  accentLight: 'bg-indigo-500/20',
  accentGradient: 'from-indigo-500 to-teal-500',
  starLabel: 'Fuel Cells',
  emoji: '🚀',
  buttonGradient: 'from-indigo-500 to-teal-500',
}

export const unicornTheme: Theme = {
  name: 'unicorn',
  bg: 'bg-[#FFB7B2]',
  bgGradient: 'bg-gradient-to-b from-[#FFB7B2] via-pink-100 to-rose-50',
  cardBg: 'bg-white',
  cardBorder: 'border-rose-100',
  textPrimary: 'text-slate-800',
  textSecondary: 'text-slate-600',
  textMuted: 'text-slate-400',
  accent: 'text-fuchsia-500',
  accentLight: 'bg-fuchsia-100',
  accentGradient: 'from-fuchsia-500 to-amber-400',
  starLabel: 'Sparkles',
  emoji: '🦄',
  buttonGradient: 'from-fuchsia-500 to-amber-400',
}

export function getTheme(pref: 'space' | 'unicorn'): Theme {
  return pref === 'space' ? spaceTheme : unicornTheme
}
