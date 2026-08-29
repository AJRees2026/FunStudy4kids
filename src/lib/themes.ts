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
  actionButtonBg: string
  actionButtonText: string
  inputBg: string       
  inputBorder: string
  inputText: string
  inputPlaceholder: string
  tagBg: string
  tagText: string
}

export const spaceTheme: Theme = {
  name: 'space',
  bg: 'bg-[#1d173b]',
  bgGradient: 'bg-[#1d173b]',
  cardBg: 'bg-[#fffaf2]',
  cardBorder: 'border-[#8d7bea]/30',
  textPrimary: 'text-black',
  textSecondary: 'text-black',
  textMuted: 'text-black',
  accent: 'text-[#ef684d]',
  accentLight: 'bg-[#ef684d]/20',
  accentGradient: 'from-[#6f5bd3] to-[#ef684d]',
  starLabel: 'Orbit Gems',
  emoji: '🚀',
  buttonGradient: 'from-[#6f5bd3] to-[#ef684d]',
  actionButtonBg: 'bg-[#87CEEB]',
  actionButtonText: 'text-[#E64A19]',
  inputBg: 'bg-white',
  inputBorder: 'border-sky-300',
  inputText: 'text-slate-800',
  inputPlaceholder: 'placeholder-slate-500',
  tagBg: 'bg-sky-200',
  tagText: 'text-sky-800',
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
  accent: 'text-[#069494]',
  accentLight: 'bg-[#069494]/30',
  accentGradient: 'from-[#eed5ff] to-[#ffc0d7]',
  starLabel: 'Star Drops',
  emoji: '🦄',
  buttonGradient: 'from-[#eed5ff] to-[#ffc0d7]',
  actionButtonBg: 'bg-[#F4C2C2]',
  actionButtonText: 'text-[#E64A19]',
  inputBg: 'bg-slate-50',
  inputBorder: 'border-slate-200',
  inputText: 'text-slate-800',
  inputPlaceholder: 'placeholder-slate-400',
  tagBg: 'bg-pink-100',
  tagText: 'text-[#069494]'
  
}

export function getTheme(pref: 'space' | 'unicorn'): Theme {
  return pref === 'space' ? spaceTheme : unicornTheme
}
