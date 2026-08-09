import { useState, useEffect, useRef } from 'react'
import { Play, Pause, X, Coffee } from 'lucide-react'

export default function FocusTimer({
  durationMins,
  onDone,
  onClose,
  isSpace = false,
}: {
  durationMins: number
  onDone: () => void
  onClose: () => void
  isSpace?: boolean
}) {
  const [secondsLeft, setSecondsLeft] = useState(durationMins * 60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = durationMins * 60
  const progress = ((total - secondsLeft) / total) * 100

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            setFinished(true)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  const radius = 120
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progress / 100) * circumference

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-pop relative ${
        isSpace ? 'bg-slate-800 border border-slate-700' : 'bg-white'
      }`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 ${isSpace ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <X className="w-6 h-6" />
        </button>

        {finished ? (
          <div className="py-8 animate-pop">
            <div className="text-7xl mb-4 animate-wiggle inline-block">🎉</div>
            <h2 className={`text-3xl font-display font-extrabold mb-2 ${
              isSpace ? 'text-cyan-400' : 'text-indigo-600'
            }`}>
              Time for a Break!
            </h2>
            <p className={`font-semibold mb-6 ${isSpace ? 'text-slate-400' : 'text-slate-500'}`}>
              Great job! Go stretch, grab a snack, or relax.
            </p>
            <button
              onClick={onDone}
              className={`text-white text-xl font-display font-bold px-8 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all ${
                isSpace
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                  : 'bg-gradient-to-r from-teal-400 to-indigo-500'
              }`}
            >
              Claim My Stars! ⭐
            </button>
          </div>
        ) : (
          <>
            <h2 className={`text-2xl font-display font-bold mb-6 ${
              isSpace ? 'text-slate-200' : 'text-slate-700'
            }`}>
              Focus Time!
            </h2>
            <div className="relative inline-flex items-center justify-center mb-6">
              <svg width="280" height="280" className="-rotate-90">
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke={isSpace ? '#334155' : '#e2e8f0'}
                  strokeWidth="16"
                />
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke="url(#timerGradient)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isSpace ? '#06b6d4' : '#14b8a6'} />
                    <stop offset="100%" stopColor={isSpace ? '#6366f1' : '#6366f1'} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-display font-extrabold tabular-nums ${
                  isSpace ? 'text-white' : 'text-slate-800'
                }`}>
                  {mins}:{secs.toString().padStart(2, '0')}
                </span>
                <span className={`font-semibold text-sm mt-1 ${
                  isSpace ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {running ? 'Stay focused!' : 'Ready?'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setRunning(!running)}
                className={`flex items-center gap-2 text-white text-lg font-display font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all ${
                  isSpace
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                    : 'bg-gradient-to-r from-teal-400 to-indigo-500'
                }`}
              >
                {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {running ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={onClose}
                className={`flex items-center gap-2 text-lg font-display font-bold px-6 py-3 rounded-2xl transition-all ${
                  isSpace ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Coffee className="w-5 h-5" />
                Quit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
