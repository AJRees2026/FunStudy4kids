import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { useI18n, type LangCode } from '../lib/i18n'

type Props = {
  onTranscribe: (text: string) => void
  lang?: LangCode
  iconSize?: number
  className?: string
}

export default function DictationButton({ onTranscribe, lang, iconSize = 18, className = '' }: Props) {
  const { lang: ctxLang } = useI18n()
  const speechLang = lang || ctxLang
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
    }
  }, [])

  const handleClick = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SR()
    recognition.lang = speechLang
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onTranscribe(transcript)
      setListening(false)
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`p-1.5 rounded-lg active:scale-90 transition-all ${className} ${
        listening
          ? 'bg-rose-500/20 text-rose-400 animate-pulse'
          : 'hover:bg-indigo-500/20 text-indigo-400'
      }`}
      aria-label="Voice dictation"
    >
      {listening
        ? <MicOff style={{ width: iconSize, height: iconSize }} />
        : <Mic style={{ width: iconSize, height: iconSize }} />
      }
    </button>
  )
}
