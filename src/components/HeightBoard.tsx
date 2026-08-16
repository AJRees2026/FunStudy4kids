import { useState, useEffect } from 'react'
import { supabase, type GrowthEntry } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import { getTheme, type Theme } from '../lib/themes'
import { ArrowLeft, Ruler, Sparkles, Check } from 'lucide-react'

type Props = {
  childId: string
  childName: string
  photoUrl: string | null
  isSpace: boolean
  theme: Theme
  onBack: () => void
}

// Real-world height milestones (cm)
const MILESTONES = [
  { height: 40, emoji: '🐧', key: 'tallerThanPenguin' },
  { height: 60, emoji: '🐕', key: 'tallerThanDog' },
  { height: 70, emoji: '🐈', key: 'tallerThanCat' },
  { height: 95, emoji: '🚲', key: 'asTallAsBicycle' },
  { height: 100, emoji: '🎸', key: 'asTallAsGuitar' },
]

export default function HeightBoard({ childId, childName, photoUrl, isSpace, theme, onBack }: Props) {
  const { t } = useI18n()
  const [entries, setEntries] = useState<GrowthEntry[]>([])
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    const fetchEntries = async () => {
      const { data } = await supabase
        .from('growth_entries')
        .select('*')
        .eq('child_id', childId)
        .order('recorded_at', { ascending: true })
      if (data) {
        const prev = entries
        setEntries(data as GrowthEntry[])
        // Check if a new entry was added
        if (prev.length > 0 && data.length > prev.length) {
          setShowBadge(true)
          setTimeout(() => setShowBadge(false), 5000)
        }
      }
    }
    fetchEntries()
  }, [childId])

  const latestHeight = entries.length > 0
    ? entries.filter(e => e.height_cm != null).slice(-1)[0]?.height_cm
    : null
  const heightCm = latestHeight ? Number(latestHeight) : 100

  // Find achieved milestones
  const achievedMilestones = MILESTONES.filter(m => heightCm >= m.height)
  const nextMilestone = MILESTONES.find(m => heightCm < m.height)

  // Ruler dimensions
  const rulerHeight = 280
  const rulerMaxCm = 160
  const rulerMinCm = 30
  const pxPerCm = rulerHeight / (rulerMaxCm - rulerMinCm)
  const childMarkerY = rulerHeight - (heightCm - rulerMinCm) * pxPerCm

  return (
    <div className={`min-h-screen ${theme.bgGradient} pb-8`}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-indigo-500" />
            {t('heightBoard')}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Celebration badge */}
        {showBadge && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-display font-bold px-6 py-3 rounded-2xl shadow-xl animate-pop flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('growthBadge')}
          </div>
        )}

        {/* Height Board */}
        <div className={`rounded-3xl p-6 ${theme.cardBg} border ${theme.cardBorder} shadow-lg`}>
          <h2 className={`font-display font-extrabold text-2xl ${theme.textPrimary} text-center mb-6`}>
            {t('howMuchIVeGrown')}
          </h2>

          <div className="flex items-end justify-center gap-4 mb-6">
            {/* Avatar */}
            <div className="flex flex-col items-center" style={{ height: `${rulerHeight + 40}px`, justifyContent: 'flex-end' }}>
              <div
                className="transition-all duration-1000 ease-out"
                style={{ marginBottom: `${childMarkerY}px` }}
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-teal-400 flex items-center justify-center overflow-hidden shadow-lg">
                  {photoUrl ? (
                    <img src={photoUrl} alt={childName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{isSpace ? '🚀' : '🦄'}</span>
                  )}
                </div>
                <div className="text-center mt-1">
                  <p className={`text-xs font-bold ${theme.textSecondary}`}>{childName}</p>
                </div>
              </div>
            </div>

            {/* Wooden Ruler */}
            <div className="relative" style={{ height: `${rulerHeight}px` }}>
              <svg width="60" height={rulerHeight} viewBox={`0 0 60 ${rulerHeight}`}>
                {/* Ruler body */}
                <defs>
                  <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#92400e" />
                    <stop offset="50%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#92400e" />
                  </linearGradient>
                </defs>
                <rect x="10" y="0" width="40" height={rulerHeight} rx="6" fill="url(#woodGrad)" />

                {/* Tick marks every 10cm */}
                {Array.from({ length: Math.floor((rulerMaxCm - rulerMinCm) / 10) + 1 }).map((_, i) => {
                  const cm = rulerMinCm + i * 10
                  const y = rulerHeight - (cm - rulerMinCm) * pxPerCm
                  return (
                    <g key={cm}>
                      <line x1="30" y1={y} x2="50" y2={y} stroke="#fef3c7" strokeWidth="2" />
                      <text x="28" y={y + 4} textAnchor="end" fontSize="10" fill="#fef3c7" fontWeight="bold">{cm}</text>
                    </g>
                  )
                })}

                {/* Minor ticks every 5cm */}
                {Array.from({ length: Math.floor((rulerMaxCm - rulerMinCm) / 5) + 1 }).map((_, i) => {
                  const cm = rulerMinCm + i * 5
                  if (cm % 10 === 0) return null
                  const y = rulerHeight - (cm - rulerMinCm) * pxPerCm
                  return <line key={cm} x1="35" y1={y} x2="50" y2={y} stroke="#fef3c7" strokeWidth="1" opacity="0.6" />
                })}
              </svg>

              {/* Height marker line */}
              <div
                className="absolute left-0 right-0 transition-all duration-1000 ease-out"
                style={{ top: `${childMarkerY}px` }}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <div className="flex-1 h-0.5 bg-indigo-500"></div>
                  <span className="text-xs font-bold text-indigo-500 bg-white/80 px-2 py-0.5 rounded-full">
                    {heightCm.toFixed(0)} cm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current height */}
          <div className="text-center mb-6">
            <p className={`text-4xl font-display font-extrabold ${theme.accent}`}>
              {heightCm.toFixed(0)} cm
            </p>
          </div>

          {/* Milestone comparisons */}
          <div className="space-y-2">
            {achievedMilestones.length > 0 && (
              <p className={`text-sm font-bold ${theme.textSecondary} mb-2`}>
                {isSpace ? '🌟' : '✨'} {t('howMuchIVeGrown')}
              </p>
            )}
            {achievedMilestones.map((m, i) => (
              <div
                key={m.key}
                className={`flex items-center gap-3 p-3 rounded-2xl ${isSpace ? 'bg-indigo-500/20' : 'bg-fuchsia-500/20'} animate-fadeIn`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-2xl">{m.emoji}</span>
                <p className={`font-display font-bold ${theme.textPrimary}`}>{t(m.key)}</p>
                <Check className={`w-4 h-4 ml-auto ${theme.accent}`} />
              </div>
            ))}
            {nextMilestone && (
              <div className={`flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed ${isSpace ? 'border-indigo-400/40' : 'border-fuchsia-400/40'} opacity-60`}>
                <span className="text-2xl grayscale">{nextMilestone.emoji}</span>
                <p className={`font-display font-bold ${theme.textSecondary}`}>
                  {t(nextMilestone.key)} ({(nextMilestone.height - heightCm).toFixed(0)} cm)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Growth history */}
        {entries.filter(e => e.height_cm != null).length > 0 && (
          <div className={`mt-4 rounded-3xl p-5 ${theme.cardBg} border ${theme.cardBorder}`}>
            <h3 className={`font-display font-bold ${theme.textPrimary} mb-3`}>{t('measurementDate')}</h3>
            <div className="space-y-2">
              {entries.filter(e => e.height_cm != null).slice().reverse().map(e => (
                <div key={e.id} className={`flex items-center gap-3 p-2 rounded-xl ${isSpace ? 'bg-slate-800/40' : 'bg-white/60'}`}>
                  <span className="text-lg">{isSpace ? '📏' : '🌈'}</span>
                  <span className={`text-sm font-bold ${theme.textPrimary}`}>{Number(e.height_cm).toFixed(0)} cm</span>
                  <span className={`text-xs ${theme.textSecondary} ml-auto`}>{e.recorded_at}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
