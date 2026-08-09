import { LANGUAGES, type LangCode } from './i18n'

export function getSpeechLang(): LangCode {
  const stored = localStorage.getItem('appLang') as LangCode | null
  return stored || 'en-US'
}

export function setSpeechLang(lang: LangCode) {
  localStorage.setItem('appLang', lang)
}

export function speak(text: string, lang: LangCode = getSpeechLang()) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.pitch = 1.1
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

export { LANGUAGES }
