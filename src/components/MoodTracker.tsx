import { useState, useEffect, useCallback } from 'react'
import { supabase, type MoodEntry, type MoodType } from '../lib/supabase'
import { getTheme, type Theme } from '../lib/themes'
import { useI18n } from '../lib/i18n'
import { Smile, ArrowLeft, ArrowRight, Check } from 'lucide-react'

type Props = {
  childId: string
  theme: Theme
  isSpace: boolean
}

export const MOODS: { key: MoodType; emoji: string; color: string; bgClass: string; textClass: string }[] = [
  { key: 'fantastic', emoji: '🏖️', color: '#FFD166', bgClass: 'bg-[#FFD166]', textClass: 'text-[#9a6b00]' },
  { key: 'good', emoji: '☀️', color: '#06D6A0', bgClass: 'bg-[#06D6A0]', textClass: 'text-[#005c44]' },
  { key: 'okay', emoji: '🌤️', color: '#118AB2', bgClass: 'bg-[#118AB2]', textClass: 'text-white' },
  { key: 'sad', emoji: '🌦️', color: '#B19FFB', bgClass: 'bg-[#B19FFB]', textClass: 'text-[#3d2b6b]' },
  { key: 'frustrated', emoji: '❄️', color: '#EF476F', bgClass: 'bg-[#EF476F]', textClass: 'text-white' },
]

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function MoodTracker({ childId, theme, isSpace }: Props) {
  const { t } = useI18n()
  const [entries, setEntries] = useState<MoodEntry[]>([])
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
  const startOffset = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()

  const fetchEntries = useCallback(async () => {
    const start = dateKey(monthStart)
    const end = dateKey(monthEnd)
    const { data } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('child_id', childId)
      .gte('entry_date', start)
      .lte('entry_date', end)
      .order('entry_date', { ascending: true })
    if (data) setEntries(data as MoodEntry[])
  }, [childId, monthStart, monthEnd])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const entryMap = new Map<string, MoodEntry>()
  entries.forEach((e) => entryMap.set(e.entry_date, e))

  const today = new Date()
  const todayKey = dateKey(today)

  const handleDayClick = (day: number) => {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    const key = dateKey(date)
    const existing = entryMap.get(key)
    setSelectedDate(date)
    setSelectedMood(existing?.mood ?? null)
    setNote(existing?.note ?? '')
  }

  const saveMood = async () => {
    if (!selectedDate || !selectedMood) return
    setSaving(true)
    const key = dateKey(selectedDate)
    const existing = entryMap.get(key)

    if (existing) {
      await supabase
        .from('mood_entries')
        .update({ mood: selectedMood, note: note.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('mood_entries')
        .insert({
          child_id: childId,
          entry_date: key,
          mood: selectedMood,
          note: note.trim() || null,
        })
    }

    setSaving(false)
    setSelectedDate(null)
    setSelectedMood(null)
    setNote('')
    setToast(t('moodSaved'))
    setTimeout(() => setToast(null), 2500)
    fetchEntries()
  }

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <section className={`rounded-3xl p-4 ${theme.cardBg} border ${theme.cardBorder}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary} flex items-center gap-2`}>
            <Smile className={`w-5 h-5 ${theme.accent}`} />
            {t('moodTracker')}
          </h2>
          <p className={`text-xs font-semibold mt-1 ${theme.textMuted}`}>{t('moodTrackerDesc')}</p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className={`p-2 rounded-xl ${isSpace ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${theme.textSecondary} transition-colors`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className={`font-display font-bold text-l ${theme.textPrimary}`}>{monthLabel}</span>
        <button onClick={nextMonth} className={`p-2 rounded-xl ${isSpace ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${theme.textSecondary} transition-colors`}>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className={`text-center text-xs font-bold ${theme.textMuted}`}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const key = dateKey(date)
          const entry = entryMap.get(key)
          const mood = entry ? MOODS.find((m) => m.key === entry.mood) : null
          const isToday = key === todayKey
          const isFuture = date > today

          return (
            <button
              key={i}
              onClick={() => !isFuture && handleDayClick(day)}
              disabled={isFuture}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                ${isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 active:scale-95 cursor-pointer'}
                ${mood ? mood.bgClass : isSpace ? 'bg-[#B0C4DE]' : 'bg-slate-50'}
                ${isToday ? 'ring-2 ring-offset-1 ring-offset-transparent ' + (isSpace ? 'ring-white/60' : 'ring-slate-400') : ''}
              `}
            >
              <span className={`leading-none ${mood ? `text-2xl ${mood.textClass}` : `text-sm font-bold ${theme.textMuted}`}`}>
                {mood ? mood.emoji : day}
              </span>
              {mood && (
                <span className={`text-xs font-bold mt-0.5 ${mood.textClass} opacity-80`}>{day}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Mood legend */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {MOODS.map((m) => (
          <div key={m.key} className="flex items-center gap-1.5">
            <span className={`w-7 h-7 rounded-lg ${m.bgClass} flex items-center justify-center text-xl`}>{m.emoji}</span>
            <span className={`text-sm font-bold`}>{t(`mood${m.key.charAt(0).toUpperCase() + m.key.slice(1)}`)}</span>
          </div>
        ))}
      </div>

      {/* Mood selection modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-4" onClick={() => setSelectedDate(null)}>
          <div
            className={`rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-pop ${isSpace ? 'bg-[#B0C4DE] border border-slate-700' : 'bg-[#fffaf2]'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`font-display font-extrabold text-lg mb-1 ${isSpace ? 'text-black' : 'text-slate-800'}`}>
              {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            <p className={`text-sm font-semibold mb-4 ${isSpace ? 'text-black' : 'text-slate-500'}`}>{t('howAreYouFeeling')}</p>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMood(m.key)}
                  className={`
                    flex flex-col items-center gap-1 rounded-2xl py-3 transition-all
                    ${selectedMood === m.key ? `${m.bgClass} scale-110 ring-2 ring-white/50` : isSpace ? 'bg-white/85 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'}
                  `}
                >
                  <span className="text-10sm">{m.emoji}</span>
                  <span className={`text-s font-bold ${selectedMood === m.key ? m.textClass : isSpace ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t(`mood${m.key.charAt(0).toUpperCase() + m.key.slice(1)}`)}
                  </span>
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('moodNotePlaceholder')}
              maxLength={200}
              rows={2}
              className={`
                w-full rounded-2xl p-3 text-sm font-semibold outline-none resize-none mb-4
                ${isSpace ? 'bg-slate-700/50 text-white placeholder:text-slate-500' : 'bg-slate-50 text-slate-700 placeholder:text-slate-400'}
              `}
            />

            <button
              onClick={saveMood}
              disabled={!selectedMood || saving}
              className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> {t('saveMood')}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs">
          <div className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-5 py-3 rounded-2xl shadow-2xl animate-pop">
            {toast}
          </div>
        </div>
      )}
    </section>
  )
}

// Exported for parent view reuse
export { MOODS as MOOD_LIST }
export { dateKey as formatDateKey }
