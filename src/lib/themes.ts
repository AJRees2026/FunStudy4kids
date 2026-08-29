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
  bg: 'bg-[#1d173b]',
  bgGradient: 'bg-[#1d173b]',
  cardBg: 'bg-[#fffaf2]',
  cardBorder: 'border-[#8d7bea]/30',
  textPrimary: 'text-white',
  textSecondary: 'text-black',
  textMuted: 'text-white',
  accent: 'text-[#ef684d]',
  accentLight: 'bg-[#ef684d]/20',
  accentGradient: 'from-[#6f5bd3] to-[#ef684d]',
  starLabel: 'Orbit Gems',
  emoji: '🚀',
  buttonGradient: 'from-[#6f5bd3] to-[#ef684d]',
}

export const unicornTheme: Theme = {
  name: 'unicorn',
  bg: 'bg-[#eed5ff]',
  bgGradient: 'bg-gradient-to-b from-[#eed5ff] via-[#fff9c1] to-[#cfebd2]',
  cardBg: 'bg-white/80',
  cardBorder: 'border-[#ffc0d7]',
  textPrimary: 'text-[#c11c84]',
  textSecondary: 'text-[#c11c84]',
  textMuted: 'text-[#1f0a40]',
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
