const DEFAULT_LANG = 'en-US'
const PITCH = 1.1
const RATE = 0.9

let selectedLang = DEFAULT_LANG

export function setSpeechLang(lang: string) {
  selectedLang = lang
}

export function getSpeechLang(): string {
  return selectedLang
}

export function speak(text: string, lang?: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang || selectedLang
  utterance.pitch = PITCH
  utterance.rate = RATE
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
