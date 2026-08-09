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
  bg: 'bg-slate-950',
  bgGradient: 'bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950',
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
  bg: 'bg-rose-50',
  bgGradient: 'bg-gradient-to-b from-rose-50 via-fuchsia-50 to-violet-50',
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
