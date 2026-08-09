import { useState } from 'react'
import { Volume2 } from 'lucide-react'
import { speak, isSpeechSupported } from '../lib/tts'

type Props = {
  text: string
  lang?: string
  className?: string
  iconSize?: number
}

export default function SpeakButton({ text, lang, className = '', iconSize = 18 }: Props) {
  const [speaking, setSpeaking] = useState(false)

  if (!isSpeechSupported()) return null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSpeaking(true)
    speak(text, lang)

    // Reset speaking state after a delay based on text length
    const duration = Math.max(1500, text.length * 80)
    setTimeout(() => setSpeaking(false), duration)
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 ${
        speaking ? 'animate-pulse bg-amber-400 text-white' : 'text-slate-400 hover:text-amber-500'
      } ${className}`}
      title="Listen"
      aria-label={`Listen to ${text}`}
    >
      <Volume2 size={iconSize} />
    </button>
  )
}
