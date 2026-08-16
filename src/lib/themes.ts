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
  bg: 'bg-[#0a173b]',
  bgGradient: 'bg-gradient-to-b from-[#0a173b] via-[#050b14]/90 to-[#ff6700]',
  cardBg: 'bg-[#EEEEEE]',
  cardBorder: 'border-slate-300',
  textPrimary: 'text-slate-900',
  textSecondary: 'text-slate-700',
  textMuted: 'text-slate-500',
  accent: 'text-[#ff6700]',
  accentLight: 'bg-[#ff6700]/20',
  accentGradient: 'from-[#0a173b] to-[#ff6700]',
  starLabel: 'Fuel Cells',
  emoji: '🚀',
  buttonGradient: 'from-[#0a173b] to-[#ff6700]',
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
