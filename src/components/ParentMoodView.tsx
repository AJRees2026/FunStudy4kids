import { useState, useEffect, useCallback } from 'react'
import { supabase, type MoodEntry, type MoodType } from '../lib/supabase'
import { type Theme } from '../lib/themes'
import { useI18n } from '../lib/i18n'
import { MOOD_LIST, formatDateKey } from './MoodTracker'
import { Smile, ArrowLeft, ArrowRight } from 'lucide-react'

type Props = {
  childId: string
  childName: string
  theme: Theme
  isSpace: boolean
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function ParentMoodView({ childId, childName, theme, isSpace }: Props) {
  const { t } = useI18n()
  const [entries, setEntries] = useState<MoodEntry[]>([])
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
  const startOffset = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()

  const fetchEntries = useCallback(async () => {
    const start = formatDateKey(monthStart)
    const end = formatDateKey(monthEnd)
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

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Build summary counts
  const summary: { mood: MoodType; emoji: string; bgClass: string; textClass: string; count: number }[] = []
  MOOD_LIST.forEach((m) => {
    const count = entries.filter((e) => e.mood === m.key).length
    if (count > 0) summary.push({ mood: m.key, emoji: m.emoji, bgClass: m.bgClass, textClass: m.textClass, count })
  })
  const totalLogged = entries.length

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
      <h3 className="font-display font-bold text-slate-700 mb-1 flex items-center gap-2">
        <Smile className="w-5 h-5 text-fuchsia-500" />
        {childName} — {t('moodTracker')}
      </h3>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3 mt-3">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-display font-bold text-sm text-slate-700">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-xs font-bold text-slate-400">{d}</div>
        ))}
      </div>

      {/* Calendar grid (read-only) */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const key = formatDateKey(date)
          const entry = entryMap.get(key)
          const mood = entry ? MOOD_LIST.find((m) => m.key === entry.mood) : null

          return (
            <div
              key={i}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center
                ${mood ? mood.bgClass : 'bg-slate-50'}
              `}
            >
              <span className={`text-lg leading-none ${mood ? mood.textClass : 'text-slate-300'}`}>
                {mood ? mood.emoji : day}
              </span>
              {mood && (
                <span className={`text-[9px] font-bold mt-0.5 ${mood.textClass} opacity-80`}>{day}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-5">
        <h4 className="font-display font-bold text-sm text-slate-600 mb-3">{t('moodSummary')}</h4>
        {totalLogged === 0 ? (
          <p className="text-slate-400 text-sm font-semibold">{t('noMoodData')}</p>
        ) : (
          <div className="space-y-2">
            {summary.map((s) => (
              <div key={s.mood} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg ${s.bgClass} flex items-center justify-center text-sm`}>{s.emoji}</span>
                <span className="text-sm font-bold text-slate-600 flex-1">
                  {t(`mood${s.mood.charAt(0).toUpperCase() + s.mood.slice(1)}`)}
                </span>
                <span className="text-sm font-bold text-slate-700">{s.count} {t('moodDays')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
