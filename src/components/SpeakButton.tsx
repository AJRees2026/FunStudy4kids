import { Volume2 } from 'lucide-react'
import { speak, getSpeechLang } from '../lib/speech'

type Props = {
  text: string
  lang?: string
  iconSize?: number
  className?: string
}

export default function SpeakButton({ text, lang, iconSize = 18, className = '' }: Props) {
  const speechLang = lang || getSpeechLang()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(text, speechLang) }}
      className={`p-1 rounded-lg hover:bg-indigo-500/20 active:scale-90 transition-all ${className}`}
      aria-label="Speak"
    >
      <Volume2 className="text-indigo-400" style={{ width: iconSize, height: iconSize }} />
    </button>
  )
}
