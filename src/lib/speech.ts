export function getSpeechLang(): string {
  return localStorage.getItem('speechLang') || 'en-US'
}

export function setSpeechLang(lang: string) {
  localStorage.setItem('speechLang', lang)
}

export function speak(text: string, lang: string = getSpeechLang()) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.pitch = 1.1
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

export const LANGUAGES = [
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'it-IT', label: 'Italiano', flag: '🇮🇹' },
]
