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
  bg: 'bg-[##0B162A]',
  bgGradient: 'bg-gradient-to-b from-[#0B162A] via-[#0B162A]/90 to-[#050B14]',
  cardBg: 'bg-[#0B162A]/60',
  cardBorder: 'border-[#0B162A]',
  textPrimary: 'text-white',
  textSecondary: 'text-slate-300',
  textMuted: 'text-slate-400',
  accent: 'text-[#E64100]',
  accentLight: 'bg-[#E64100]/20',
  accentGradient: 'from-[#0B162A] to-[#E64100]',
  starLabel: 'Fuel Cells',
  emoji: '🚀',
  buttonGradient: 'from-[#0B162A] to-[#E64100]',
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
