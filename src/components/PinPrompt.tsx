import { useState } from 'react'
import { Shield, X, Lock } from 'lucide-react'
import { useI18n } from '../lib/i18n'

type Props = {
  title: string
  subtitle: string
  expectedPin: string
  isSpace: boolean
  onSuccess: () => void
  onCancel: () => void
}

export default function PinPrompt({
  title, subtitle, expectedPin, isSpace, onSuccess, onCancel,
}: Props) {
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (pin === expectedPin) {
      onSuccess()
    } else {
      setError(t('wrongPin'))
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-pop ${
        isSpace ? 'bg-slate-800 border border-slate-700' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isSpace ? 'bg-indigo-900/60' : 'bg-indigo-100'
            }`}>
              <Shield className={`w-5 h-5 ${isSpace ? 'text-indigo-400' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h2 className={`font-display font-extrabold text-lg ${isSpace ? 'text-white' : 'text-slate-800'}`}>
                {title}
              </h2>
              <p className={`text-xs font-semibold ${isSpace ? 'text-slate-400' : 'text-slate-400'}`}>
                {subtitle}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className={`p-1 rounded-lg ${isSpace ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Lock className={`w-8 h-8 ${isSpace ? 'text-amber-400' : 'text-amber-500'}`} />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && pin.length === 4 && handleSubmit()}
            placeholder="• • • •"
            className={`w-full text-center text-3xl tracking-[0.5em] font-display font-bold rounded-2xl py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              isSpace
                ? 'bg-slate-900/60 text-white placeholder-slate-600'
                : 'bg-slate-50 text-slate-800 placeholder-slate-300'
            }`}
            autoFocus
          />
          {error && (
            <p className="text-rose-400 text-sm font-semibold animate-pop">{error}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={pin.length !== 4}
            className={`w-full font-display font-bold text-lg py-3 rounded-2xl transition-all ${
              pin.length === 4
                ? 'bg-gradient-to-r from-indigo-500 to-teal-500 text-white hover:scale-[1.02] active:scale-95'
                : isSpace
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {t('approve')}
          </button>
          <button
            onClick={onCancel}
            className={`text-sm font-semibold ${isSpace ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
