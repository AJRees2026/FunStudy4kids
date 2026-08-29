import { useState, useEffect, useCallback } from 'react'
import { PenLine, Plus, X, Trash2, Pencil, Award, BookOpen, Calendar, Lock, Clock as Unlock } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { supabase, type BookReflection, type ReflectionStatus, type WritingRank, WRITING_MILESTONES } from '../lib/supabase'
import type { Theme } from '../lib/themes'

const GENRES = [
  { key: 'fantasy', labelKey: 'genreFantasy' },
  { key: 'reality', labelKey: 'genreReality' },
  { key: 'comedy', labelKey: 'genreComedy' },
  { key: 'scifi', labelKey: 'genreSciFi' },
]

const RANK_META: Record<WritingRank, { labelKey: string; emoji: string; color: string }> = {
  junior_author: { labelKey: 'rankJuniorAuthor', emoji: '📝', color: 'from-sky-400 to-blue-500' },
  storyteller: { labelKey: 'rankStoryteller', emoji: '📖', color: 'from-teal-400 to-emerald-500' },
  master_storyteller: { labelKey: 'rankMasterStoryteller', emoji: '✒️', color: 'from-amber-400 to-orange-500' },
  master_wordsmith: { labelKey: 'rankMasterWordsmith', emoji: '🌟', color: 'from-rose-400 to-fuchsia-500' },
  grand_chronicler: { labelKey: 'rankGrandChronicler', emoji: '🏅', color: 'from-violet-400 to-purple-500' },
  epic_author: { labelKey: 'rankEpicAuthor', emoji: '🏆', color: 'from-yellow-400 to-amber-600' },
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

function getRankForWordCount(totalWords: number): WritingRank | null {
  let result: WritingRank | null = null
  for (const m of WRITING_MILESTONES) {
    if (totalWords >= m.threshold) result = m.rank
  }
  return result
}

function getNextMilestone(totalWords: number): { threshold: number; rank: WritingRank; points: number } | null {
  for (const m of WRITING_MILESTONES) {
    if (totalWords < m.threshold) return m
  }
  return null
}

function calcDayCount(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff + 1 : null
}

type BookReflectionsProps = {
  childId: string
  theme: Theme
  isSpace: boolean
  onPointsAwarded?: (count: number) => void
  onMilestoneReached?: (rank: WritingRank) => void
  readOnly?: boolean
}

export default function BookReflections({ childId, theme, isSpace, onPointsAwarded, onMilestoneReached, readOnly = false }: BookReflectionsProps) {
  const { t } = useI18n()
  const [reflections, setReflections] = useState<BookReflection[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingReflection, setEditingReflection] = useState<BookReflection | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [totalWords, setTotalWords] = useState(0)
  const [currentRank, setCurrentRank] = useState<WritingRank | null>(null)

  const [form, setForm] = useState({
    book_title: '',
    characters: [] as string[],
    genre: '',
    start_date: '',
    end_date: '',
    reflection_text: '',
    allow_guardian_edit: false,
  })
  const [newCharacter, setNewCharacter] = useState('')

  const fetchReflections = useCallback(async () => {
    const { data } = await supabase
      .from('book_reflections')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
    if (data) {
      setReflections(data as BookReflection[])
      const words = (data as BookReflection[]).reduce((sum, r) => sum + r.word_count, 0)
      setTotalWords(words)
      setCurrentRank(getRankForWordCount(words))
    }
  }, [childId])

  useEffect(() => { fetchReflections() }, [fetchReflections])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const openAddModal = () => {
    setEditingReflection(null)
    setForm({ book_title: '', characters: [], genre: '', start_date: '', end_date: '', reflection_text: '', allow_guardian_edit: false })
    setNewCharacter('')
    setShowModal(true)
  }

  const openEditModal = (reflection: BookReflection) => {
    setEditingReflection(reflection)
    setForm({
      book_title: reflection.book_title,
      characters: reflection.character ? reflection.character.split(',').map(c => c.trim()).filter(Boolean) : [],
      genre: reflection.genre || '',
      start_date: reflection.start_date || '',
      end_date: reflection.end_date || '',
      reflection_text: reflection.reflection_text,
      allow_guardian_edit: reflection.allow_guardian_edit,
    })
    setNewCharacter('')
    setShowModal(true)
  }

  const addCharacter = () => {
    const name = newCharacter.trim()
    if (name && !form.characters.includes(name)) {
      setForm({ ...form, characters: [...form.characters, name] })
    }
    setNewCharacter('')
  }

  const removeCharacter = (name: string) => {
    setForm({ ...form, characters: form.characters.filter(c => c !== name) })
  }

  const toggleGuardianEdit = async (reflection: BookReflection) => {
    const newValue = !reflection.allow_guardian_edit
    await supabase.from('book_reflections').update({
      allow_guardian_edit: newValue,
      edit_request_status: null,
      updated_at: new Date().toISOString(),
    }).eq('id', reflection.id)
    fetchReflections()
  }

  const saveReflection = async () => {
    if (!form.book_title.trim() || !form.reflection_text.trim()) return

    const wordCount = countWords(form.reflection_text)
    const prevTotal = totalWords
    const charactersStr = form.characters.join(', ')

    if (editingReflection) {
      const prevReflectionWords = editingReflection.word_count
      const newTotalAfterSave = prevTotal - prevReflectionWords + wordCount

      await supabase.from('book_reflections').update({
        book_title: form.book_title.trim(),
        character: charactersStr || null,
        genre: form.genre || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        reflection_text: form.reflection_text.trim(),
        word_count: wordCount,
        allow_guardian_edit: form.allow_guardian_edit,
        updated_at: new Date().toISOString(),
      }).eq('id', editingReflection.id)

      const prevRank = getRankForWordCount(prevTotal)
      const newRank = getRankForWordCount(newTotalAfterSave)

      if (newRank && newRank !== prevRank) {
        await updateWritingRank(newRank)
        const milestone = WRITING_MILESTONES.find(m => m.rank === newRank)
        if (milestone && onPointsAwarded) {
          onPointsAwarded(milestone.points)
        }
        if (onMilestoneReached) {
          onMilestoneReached(newRank)
        }
        showToast(`${t('milestoneUnlocked')} ${RANK_META[newRank].emoji} ${t(RANK_META[newRank].labelKey)}`)
      } else {
        showToast(t('reflectionSaved'))
      }
    } else {
      const newTotalAfterSave = prevTotal + wordCount

      await supabase.from('book_reflections').insert({
        child_id: childId,
        book_title: form.book_title.trim(),
        character: charactersStr || null,
        genre: form.genre || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        reflection_text: form.reflection_text.trim(),
        word_count: wordCount,
        status: 'approved' as ReflectionStatus,
        allow_guardian_edit: form.allow_guardian_edit,
      })

      const prevRank = getRankForWordCount(prevTotal)
      const newRank = getRankForWordCount(newTotalAfterSave)

      if (newRank && newRank !== prevRank) {
        await updateWritingRank(newRank)
        const milestone = WRITING_MILESTONES.find(m => m.rank === newRank)
        if (milestone && onPointsAwarded) {
          onPointsAwarded(milestone.points)
        }
        if (onMilestoneReached) {
          onMilestoneReached(newRank)
        }
        showToast(`${t('milestoneUnlocked')} ${RANK_META[newRank].emoji} ${t(RANK_META[newRank].labelKey)}`)
      } else {
        showToast(t('reflectionSaved'))
      }
    }

    setShowModal(false)
    fetchReflections()
  }

  const updateWritingRank = async (rank: WritingRank) => {
    await supabase.from('profiles').update({ writing_rank: rank }).eq('id', childId)
    setCurrentRank(rank)
  }

  const deleteReflection = async (reflection: BookReflection) => {
    await supabase.from('book_reflections').delete().eq('id', reflection.id)
    showToast(t('reflectionDeleted'))
    fetchReflections()
  }

  const liveWordCount = countWords(form.reflection_text)
  const nextMilestone = getNextMilestone(totalWords)
  const liveDayCount = calcDayCount(form.start_date, form.end_date)

  return (
    <section className={`rounded-3xl p-4 ${theme.cardBg} border ${theme.cardBorder}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PenLine className={`w-5 h-5 ${theme.accent}`} />
          <div>
            <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary}`}>{t('iWriteMyBook')}</h2>
            <p className={`text-xs font-semibold mt-0.5 ${theme.textMuted}`}>
              {t('totalWordsWritten')}: {totalWords}
            </p>
          </div>
        </div>
        {!readOnly && (
          <button
            onClick={openAddModal}
            className={`shrink-0 rounded-xl px-3 py-2 font-display font-bold text-sm text-[#E64A19] hover:scale-105 active:scale-95 bg-[#87CEEB] flex items-center gap-1.5`}
          >
            <Plus className="w-4 h-4" /> {t('writeReflection')}
          </button>
        )}
      </div>

      {/* Writing Rank Display */}
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase mb-2 ${theme.textMuted}`}>{t('writingRank')}</h3>
        <div className="flex flex-wrap gap-2">
          {WRITING_MILESTONES.map((m) => {
            const earned = totalWords >= m.threshold
            const meta = RANK_META[m.rank]
            return (
              <div
                key={m.rank}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  earned
                    ? `bg-gradient-to-r ${meta.color} text-white shadow-md`
                    : 'bg-white text-black'
                }`}
              >
                <span className={earned ? '' : 'opacity-50'}>{meta.emoji}</span>
                {t(meta.labelKey)}
                {!earned && (
                  <span className={`text-[10px] text-slate-400`}>
                    ({m.threshold})
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {nextMilestone && (
          <p className={`text-xs font-semibold mt-2 ${theme.textMuted}`}>
            {t('nextMilestone')}: {t(RANK_META[nextMilestone.rank].labelKey)} {RANK_META[nextMilestone.rank].emoji} — {nextMilestone.threshold - totalWords} {t('wordsToGo')}
          </p>
        )}
      </div>

      {/* Reflections List */}
      {reflections.length === 0 ? (
        <div className={`rounded-2xl p-6 text-center ${isSpace ? 'bg-white/5' : 'bg-slate-50'}`}>
          <PenLine className={`w-10 h-10 mx-auto mb-2 ${theme.textMuted}`} />
          <p className={`font-display font-bold text-sm ${theme.textSecondary}`}>{t('noReflectionsYet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map((reflection) => {
            const reflectionChars = reflection.character ? reflection.character.split(',').map(c => c.trim()).filter(Boolean) : []
            const reflectionDayCount = calcDayCount(reflection.start_date || '', reflection.end_date || '')
            const canGuardianEdit = readOnly && reflection.allow_guardian_edit
            return (
              <div
                key={reflection.id}
                className={`rounded-2xl p-3 border transition-all hover:scale-[1.01] ${
                  isSpace ? 'bg-white/5 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className={`w-4 h-4 shrink-0 ${isSpace ? 'text-indigo-400' : 'text-indigo-500'}`} />
                    <h3 className={`font-display font-bold text-sm ${theme.textPrimary}`}>{reflection.book_title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Guardian edit permission badge */}
                    {readOnly ? (
                      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        reflection.allow_guardian_edit
                          ? 'bg-violet-100 text-violet-600'
                          : isSpace ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {reflection.allow_guardian_edit
                          ? <><Unlock className="w-3 h-3" /> {t('guardianEditAllowed')}</>
                          : <><Lock className="w-3 h-3" /> {t('guardianEditLocked')}</>}
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleGuardianEdit(reflection)}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${
                          reflection.allow_guardian_edit
                            ? 'bg-violet-100 text-violet-600 hover:opacity-80'
                            : isSpace ? 'bg-slate-700 text-slate-400 hover:opacity-80' : 'bg-slate-100 text-slate-500 hover:opacity-80'
                        }`}
                      >
                        {reflection.allow_guardian_edit
                          ? <><Unlock className="w-3 h-3" /> {t('guardianEditAllowed')}</>
                          : <><Lock className="w-3 h-3" /> {t('guardianEditLocked')}</>}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  {reflectionChars.map((char, idx) => (
                    <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSpace ? 'bg-white text-indigo-300' : 'bg-white text-indigo-600'}`}>
                      {char}
                    </span>
                  ))}
                  {reflection.genre && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSpace ? 'bg-white text-rose-300' : 'bg-white text-rose-600'}`}>
                      {GENRES.find(g => g.key === reflection.genre) ? t(GENRES.find(g => g.key === reflection.genre)!.labelKey) : reflection.genre}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSpace ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {reflection.word_count} {t('wordCount')}
                  </span>
                  {reflectionDayCount !== null && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSpace ? 'bg-teal-900/60 text-teal-300' : 'bg-teal-100 text-teal-600'}`}>
                      <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
                      {reflectionDayCount} {t('dayCount')}
                    </span>
                  )}
                </div>

                <p className={`text-xs ${theme.textSecondary} line-clamp-3 whitespace-pre-wrap`}>{reflection.reflection_text}</p>

                {(reflection.start_date || reflection.end_date) && (
                  <p className={`text-[10px] mt-2 ${theme.textMuted}`}>
                    {reflection.start_date && reflection.start_date}
                    {reflection.start_date && reflection.end_date && ' → '}
                    {reflection.end_date && reflection.end_date}
                  </p>
                )}

                <div className="flex gap-1 mt-2">
                  {readOnly && !canGuardianEdit && (
                    <div className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold ${
                      isSpace ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-50 text-slate-400'
                    }`}>
                      <Lock className="w-3 h-3" /> {t('guardianEditLocked')}
                    </div>
                  )}
                  {readOnly && canGuardianEdit && (
                    <button
                      onClick={() => openEditModal(reflection)}
                      className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all hover:opacity-80 ${
                        isSpace ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Pencil className="w-3 h-3" /> {t('editReflection')}
                    </button>
                  )}
                  {!readOnly && (
                    <>
                      <button
                        onClick={() => openEditModal(reflection)}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all hover:opacity-80 ${
                          isSpace ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Pencil className="w-3 h-3" /> {t('editReflection')}
                      </button>
                      <button
                        onClick={() => deleteReflection(reflection)}
                        className={`flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:opacity-80 ${
                          isSpace ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-500'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setShowModal(false)}>
          <div
            className={`rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop max-h-[90vh] overflow-y-auto ${
              isSpace ? 'bg-slate-100 border border-slate-700' : 'bg-[#A8F0E0]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-display font-extrabold text-lg ${theme.textPrimary}`}>
                {editingReflection ? t('editReflection') : t('writeReflection')}
              </h2>
              <button onClick={() => setShowModal(false)} className={`p-1.5 rounded-lg transition-colors ${theme.textMuted} hover:opacity-70`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('reflectionTitle')} *</label>
                <input
                  type="text"
                  value={form.book_title}
                  onChange={(e) => setForm({ ...form, book_title: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                    isSpace ? 'bg-[#b0c4de] border-slate-600 text-black' : 'bg-[#b0c4de] border-slate-200 text-slate-800'
                  } focus:border-indigo-400`}
                />
              </div>

              {/* Characters with + button */}
              <div>
                <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('characters')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCharacter}
                    onChange={(e) => setNewCharacter(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCharacter() } }}
                    placeholder={t('addCharacter')}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                      isSpace ? 'bg-[#b0c4de] border-slate-600 text-black' : 'bg-[#b0c4de] border-slate-200 text-slate-800'
                    } focus:border-indigo-400`}
                  />
                  <button
                    onClick={addCharacter}
                    disabled={!newCharacter.trim()}
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                      newCharacter.trim()
                        ? `bg-gradient-to-r ${theme.buttonGradient} text-white hover:scale-105 active:scale-95`
                        : isSpace ? 'bg-[#b0c4de] text-slate-600' : 'bg-[#b0c4de] text-slate-300'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {form.characters.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.characters.map((char) => (
                      <span
                        key={char}
                        className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-all animate-pop ${
                          isSpace ? 'bg-[#b0c4de] text-indigo-300' : 'bg-[#b0c4de] text-indigo-600'
                        }`}
                      >
                        {char}
                        <button
                          onClick={() => removeCharacter(char)}
                          className={`hover:opacity-70 transition-opacity ${isSpace ? 'text-indigo-400' : 'text-indigo-400'}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('reflectionGenre')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => setForm({ ...form, genre: form.genre === g.key ? '' : g.key })}
                      className={`rounded-xl py-2 text-xs font-bold transition-all ${
                        form.genre === g.key
                          ? `bg-indigo-500 text-white ring-2 ring-offset-1 ${isSpace ? 'ring-offset-slate-800' : 'ring-offset-white'} ring-indigo-400`
                          : isSpace ? 'bg-[#b0c4de] text-black' : 'bg-white text-black'
                      }`}
                    >
                      {t(g.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('reflectionStartDate')}</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                      isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    } focus:border-indigo-400`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('reflectionEndDate')}</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                      isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    } focus:border-indigo-400`}
                  />
                </div>
              </div>

              {/* Day Count Tracker */}
              <div className={`rounded-2xl p-3 flex items-center gap-3 ${
                liveDayCount !== null
                  ? isSpace ? 'bg-teal-900/30 border border-teal-700/50' : 'bg-teal-50 border border-teal-200'
                  : isSpace ? 'bg-slate-700/30 border border-slate-600/50' : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  liveDayCount !== null
                    ? 'bg-gradient-to-br from-teal-400 to-emerald-500 text-white'
                    : isSpace ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
                }`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold uppercase ${theme.textMuted}`}>{t('dayCountTracker')}</p>
                  {liveDayCount !== null ? (
                    <p className={`font-display font-extrabold text-lg ${isSpace ? 'text-teal-300' : 'text-teal-600'}`}>
                      {liveDayCount} {t('dayCount')}
                    </p>
                  ) : (
                    <p className={`text-xs font-semibold ${theme.textMuted}`}>{t('setDatesToCount')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('reflectionText')} *</label>
                <textarea
                  value={form.reflection_text}
                  onChange={(e) => setForm({ ...form, reflection_text: e.target.value })}
                  rows={6}
                  placeholder={t('reflectionPlaceholder')}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border resize-y ${
                    isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  } focus:border-indigo-400`}
                />
                <div className={`text-right text-xs font-bold mt-1 ${liveWordCount > 0 ? theme.accent : theme.textMuted}`}>
                  {liveWordCount} {t('wordCount')}
                </div>
              </div>

              {/* Allow guardian edit toggle */}
              <button
                onClick={() => setForm({ ...form, allow_guardian_edit: !form.allow_guardian_edit })}
                className={`w-full flex items-center gap-3 rounded-2xl p-3 border-2 transition-all ${
                  form.allow_guardian_edit
                    ? isSpace ? 'bg-violet-900/30 border-violet-600' : 'bg-violet-50 border-violet-300'
                    : isSpace ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  form.allow_guardian_edit
                    ? 'bg-gradient-to-br from-violet-500 to-blue-600 text-white'
                    : isSpace ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
                }`}>
                  {form.allow_guardian_edit ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-display font-bold ${theme.textPrimary}`}>{t('allowGuardianEdit')}</p>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-all shrink-0 ${
                  form.allow_guardian_edit ? 'bg-violet-500' : isSpace ? 'bg-slate-600' : 'bg-slate-300'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    form.allow_guardian_edit ? 'translate-x-5' : ''
                  }`} />
                </div>
              </button>

              <button
                onClick={saveReflection}
                disabled={!form.book_title.trim() || !form.reflection_text.trim()}
                className={`w-full font-display font-bold py-3 rounded-2xl transition-all ${
                  form.book_title.trim() && form.reflection_text.trim()
                    ? `text-white hover:scale-[1.02] active:scale-95 bg-gradient-to-r ${theme.buttonGradient}`
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {t('saveReflection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs">
          <div className={`bg-gradient-to-r ${theme.buttonGradient} text-white font-display font-bold px-5 py-3 rounded-2xl shadow-2xl animate-pop flex items-center gap-2`}>
            <Award className="w-4 h-4 fill-current" />
            {toast}
          </div>
        </div>
      )}
    </section>
  )
}
