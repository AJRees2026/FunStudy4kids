import { useState, useEffect, useRef } from 'react'
import { supabase, type GrowthEntry } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import { getTheme, type Theme } from '../lib/themes'
import { ArrowLeft, Ruler, Sparkles, Check, Plus, X, Scale, Calendar } from 'lucide-react'

type Props = {
  childId: string
  childName: string
  photoUrl: string | null
  isSpace: boolean
  theme: Theme
  onBack: () => void
}

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
  const [showForm, setShowForm] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [formData, setFormData] = useState({
    recorded_at: new Date().toISOString().slice(0, 10),
    height: '',
    weight: '',
    notes: '',
  })
  const prevEntryCount = useRef(0)

  useEffect(() => {
    const fetchEntries = async () => {
      const { data } = await supabase
        .from('growth_entries')
        .select('*')
        .eq('child_id', childId)
        .order('recorded_at', { ascending: true })
      if (data) {
        setEntries(data as GrowthEntry[])
        if (prevEntryCount.current > 0 && data.length > prevEntryCount.current) {
          setShowBadge(true)
          setTimeout(() => setShowBadge(false), 5000)
        }
        prevEntryCount.current = data.length

        // Monthly reminder check
        if (data.length > 0) {
          const firstEntry = data[0]
          const lastEntry = data[data.length - 1]
          const lastDate = new Date(lastEntry.recorded_at)
          const monthsSinceLast = (Date.now() - lastDate.getTime()) / (30.44 * 24 * 3600 * 1000)
          const firstDate = new Date(firstEntry.recorded_at)
          const monthsSinceFirst = (Date.now() - firstDate.getTime()) / (30.44 * 24 * 3600 * 1000)
          // Show reminder if it's been ~1 month since last measurement
          // and at least 1 month since the first ever measurement
          if (monthsSinceLast >= 1 && monthsSinceFirst >= 1) {
            const reminderKey = `growthReminder_${childId}_${lastEntry.recorded_at}`
            if (!localStorage.getItem(reminderKey)) {
              setShowReminder(true)
            }
          }
        }
      }
    }
    fetchEntries()
  }, [childId])

  const dismissReminder = () => {
    setShowReminder(false)
    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1]
      localStorage.setItem(`growthReminder_${childId}_${lastEntry.recorded_at}`, '1')
    }
  }

  const handleSave = async () => {
    if (!formData.height && !formData.weight) return
    await supabase.from('growth_entries').insert({
      child_id: childId,
      recorded_at: formData.recorded_at,
      height_cm: formData.height ? parseFloat(formData.height) : null,
      weight_kg: formData.weight ? parseFloat(formData.weight) : null,
      notes: formData.notes || null,
    })
    setShowForm(false)
    setFormData({ recorded_at: new Date().toISOString().slice(0, 10), height: '', weight: '', notes: '' })
    setShowReminder(false)
    // Refetch
    const { data } = await supabase
      .from('growth_entries')
      .select('*')
      .eq('child_id', childId)
      .order('recorded_at', { ascending: true })
    if (data) {
      setEntries(data as GrowthEntry[])
      setShowBadge(true)
      setTimeout(() => setShowBadge(false), 5000)
    }
  }

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const latestHeight = entries.filter(e => e.height_cm != null).slice(-1)[0]?.height_cm
  const latestWeight = entries.filter(e => e.weight_kg != null).slice(-1)[0]?.weight_kg
  const heightCm = latestHeight ? Number(latestHeight) : 100
  const weightKg = latestWeight ? Number(latestWeight) : 20

  const achievedMilestones = MILESTONES.filter(m => heightCm >= m.height)
  const nextMilestone = MILESTONES.find(m => heightCm < m.height)

  // Next check-up calculation
  const lastEntryDate = latestEntry ? new Date(latestEntry.recorded_at) : null
  const nextCheckup = lastEntryDate ? new Date(lastEntryDate) : null
  if (nextCheckup) nextCheckup.setMonth(nextCheckup.getMonth() + 1)
  const daysUntilCheckup = nextCheckup
    ? Math.ceil((nextCheckup.getTime() - Date.now()) / (24 * 3600 * 1000))
    : null

  // Ruler dimensions
  const rulerHeight = 280
  const rulerMaxCm = 160
  const rulerMinCm = 30
  const pxPerCm = rulerHeight / (rulerMaxCm - rulerMinCm)
  const childMarkerY = rulerHeight - (heightCm - rulerMinCm) * pxPerCm

  return (
    <div className={`min-h-screen ${theme.bgGradient} pb-8`}>
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-indigo-500" />
              {t('heightBoard')}
            </h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {t('logMeasurement')}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Celebration badge */}
        {showBadge && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-display font-bold px-6 py-3 rounded-2xl shadow-xl animate-pop flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('growthBadge')}
          </div>
        )}

        {/* Monthly reminder */}
        {showReminder && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 animate-fadeIn flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-amber-800 text-sm">{t('monthlyReminder')}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setShowReminder(false); setShowForm(true) }}
                  className="bg-amber-500 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors"
                >
                  {t('logMeasurement')}
                </button>
                <button
                  onClick={dismissReminder}
                  className="bg-white border border-amber-300 text-amber-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Next check-up info */}
        {daysUntilCheckup != null && daysUntilCheckup > 0 && !showReminder && (
          <div className={`rounded-2xl p-3 ${theme.cardBg} border ${theme.cardBorder} flex items-center gap-2`}>
            <Calendar className={`w-4 h-4 ${theme.accent}`} />
            <p className={`text-sm font-bold ${theme.textSecondary}`}>
              {t('nextCheckup')} {daysUntilCheckup} {t('days')}
            </p>
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
              <div className="transition-all duration-1000 ease-out" style={{ marginBottom: `${childMarkerY}px` }}>
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
                <defs>
                  <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#92400e" />
                    <stop offset="50%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#92400e" />
                  </linearGradient>
                </defs>
                <rect x="10" y="0" width="40" height={rulerHeight} rx="6" fill="url(#woodGrad)" />
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
                {Array.from({ length: Math.floor((rulerMaxCm - rulerMinCm) / 5) + 1 }).map((_, i) => {
                  const cm = rulerMinCm + i * 5
                  if (cm % 10 === 0) return null
                  const y = rulerHeight - (cm - rulerMinCm) * pxPerCm
                  return <line key={cm} x1="35" y1={y} x2="50" y2={y} stroke="#fef3c7" strokeWidth="1" opacity="0.6" />
                })}
              </svg>
              <div className="absolute left-0 right-0 transition-all duration-1000 ease-out" style={{ top: `${childMarkerY}px` }}>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <div className="flex-1 h-0.5 bg-indigo-500"></div>
                  <span className="text-xs font-bold text-indigo-500 bg-white/80 px-2 py-0.5 rounded-full">{heightCm.toFixed(0)} cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current height + weight */}
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <Ruler className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
              <p className={`text-3xl font-display font-extrabold ${theme.accent}`}>{heightCm.toFixed(0)}</p>
              <p className={`text-xs font-bold ${theme.textSecondary}`}>{t('height')} ({t('cm')})</p>
            </div>
            <div className="text-center">
              <Scale className="w-6 h-6 text-teal-500 mx-auto mb-1" />
              <p className={`text-3xl font-display font-extrabold ${theme.accent}`}>{weightKg.toFixed(1)}</p>
              <p className={`text-xs font-bold ${theme.textSecondary}`}>{t('weight')} ({t('kg')})</p>
            </div>
          </div>

          {/* Milestone comparisons */}
          <div className="space-y-2">
            {achievedMilestones.length > 0 && (
              <p className={`text-sm font-bold ${theme.textSecondary} mb-2`}>
                {isSpace ? '🌟' : '✨'} {t('howMuchIVeGrown')}
              </p>
            )}
            {achievedMilestones.map((m, i) => (
              <div key={m.key} className={`flex items-center gap-3 p-3 rounded-2xl ${isSpace ? 'bg-indigo-500/20' : 'bg-fuchsia-500/20'} animate-fadeIn`} style={{ animationDelay: `${i * 100}ms` }}>
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
        {entries.length > 0 && (
          <div className={`rounded-3xl p-5 ${theme.cardBg} border ${theme.cardBorder}`}>
            <h3 className={`font-display font-bold ${theme.textPrimary} mb-3`}>{t('measurementDate')}</h3>
            <div className="space-y-2">
              {entries.slice().reverse().map(e => (
                <div key={e.id} className={`flex items-center gap-3 p-2 rounded-xl ${isSpace ? 'bg-slate-800/40' : 'bg-white/60'}`}>
                  <span className="text-lg">{isSpace ? '📏' : '🌈'}</span>
                  <span className={`text-sm font-bold ${theme.textPrimary}`}>
                    {e.height_cm ? `${Number(e.height_cm).toFixed(0)} cm` : '—'}
                    {' · '}
                    {e.weight_kg ? `${Number(e.weight_kg).toFixed(1)} kg` : '—'}
                  </span>
                  <span className={`text-xs ${theme.textSecondary} ml-auto`}>{e.recorded_at}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-extrabold text-xl text-slate-800">{t('logMeasurement')}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('measurementDate')}</label>
                <input
                  type="date"
                  value={formData.recorded_at}
                  onChange={e => setFormData({ ...formData, recorded_at: e.target.value })}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('enterHeight')} ({t('cm')})</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={e => setFormData({ ...formData, height: e.target.value })}
                  placeholder="120.5"
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('enterWeight')} ({t('kg')})</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={e => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="22.5"
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('measurementNotes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('measurementNotes')}
                  rows={2}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!formData.height && !formData.weight}
                className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {t('saveMeasurement')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
