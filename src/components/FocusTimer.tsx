import { useState, useEffect } from 'react'
import { X, Play, Pause, RotateCcw } from 'lucide-react'

type Props = {
  durationMins: number
  onDone: () => void
  onClose: () => void
  isSpace: boolean
}

export default function FocusTimer({ durationMins, onDone, onClose, isSpace }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(durationMins * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          setRunning(false)
          onDone()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running, onDone])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const progress = 1 - secondsLeft / (durationMins * 60)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center ${
        isSpace ? 'bg-slate-800 border border-slate-700' : 'bg-white'
      }`}>
        <button onClick={onClose} className={`float-right ${isSpace ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
          <X className="w-6 h-6" />
        </button>
        <h2 className={`font-display font-extrabold text-2xl mb-6 ${isSpace ? 'text-white' : 'text-slate-800'}`}>
          Focus Time!
        </h2>
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke={isSpace ? '#334155' : '#e2e8f0'} strokeWidth="12" />
            <circle
              cx="100" cy="100" r="90" fill="none" stroke="url(#grad)" strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progress)}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center font-display font-extrabold text-4xl ${isSpace ? 'text-white' : 'text-slate-800'}`}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          {!running ? (
            <button
              onClick={() => setRunning(true)}
              className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-8 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5" /> Start
            </button>
          ) : (
            <button
              onClick={() => setRunning(false)}
              className={`font-display font-bold px-8 py-3 rounded-2xl transition-all flex items-center gap-2 ${
                isSpace ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              <Pause className="w-5 h-5" /> Pause
            </button>
          )}
          <button
            onClick={() => { setRunning(false); setSecondsLeft(durationMins * 60) }}
            className={`font-display font-bold px-6 py-3 rounded-2xl transition-all ${
              isSpace ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
