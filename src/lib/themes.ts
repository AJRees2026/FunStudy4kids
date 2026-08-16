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
  textPrimary: 'text-[#000000]',
  textSecondary: 'text-[#000000]/90',
  textMuted: 'text-[#FFFFFF]/70',
  accent: 'text-[#ff6700]',
  accentLight: 'bg-[#ff6700]/20',
  accentGradient: 'from-[#0a173b] to-[#ff6700]',
  starLabel: 'Fuel Cells',
  emoji: '🚀',
  buttonGradient: 'from-[#0a173b] to-[#ff6700]',
}

export const unicornTheme: Theme = {
  name: 'unicorn',
  bg: 'bg-[#eed5ff]',
  bgGradient: 'bg-gradient-to-b from-[#eed5ff] via-[#fff9c1] to-[#cfebd2]',
  cardBg: 'bg-white/80',
  cardBorder: 'border-[#ffc0d7]',
  textPrimary: 'text-[#c11c84]',
  textSecondary: 'text-[#c11c84]',
  textMuted: 'text-slate-400',
  accent: 'text-[#ffc0d7]',
  accentLight: 'bg-[#ffc0d7]/30',
  accentGradient: 'from-[#eed5ff] to-[#ffc0d7]',
  starLabel: 'Sparkles',
  emoji: '🦄',
  buttonGradient: 'from-[#eed5ff] to-[#ffc0d7]',
}

export function getTheme(pref: 'space' | 'unicorn'): Theme {
  return pref === 'space' ? spaceTheme : unicornTheme
}
