import { Volume2 } from 'lucide-react'
import { speak } from '../lib/speech'
import { useI18n } from '../lib/i18n'

type Props = {
  text: string
  iconSize?: number
  className?: string
}

export default function SpeakButton({ text, iconSize = 18, className = '' }: Props) {
  const { lang } = useI18n()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(text, lang) }}
      className={`p-1 rounded-lg hover:bg-indigo-500/20 active:scale-90 transition-all ${className}`}
      aria-label="Speak"
    >
      <Volume2 className="text-indigo-400" style={{ width: iconSize, height: iconSize }} />
    </button>
  )
}
