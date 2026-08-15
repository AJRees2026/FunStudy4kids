import { useState } from 'react'
import { BookOpen, Calculator, FlaskConical, Globe as Globe2, Star, Plus, Check } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { supabase, type Task } from '../lib/supabase'
import type { Theme } from '../lib/themes'

type SubjectKey = 'english' | 'mathematics' | 'science' | 'socialStudies'

type SubjectProgressProps = {
  tasks: Task[]
  theme: Theme
  isSpace: boolean
  childId: string
  onTasksChange: () => void
}

type SubjectConfig = {
  key: SubjectKey
  label: string
  icon: typeof BookOpen
  color: string
  barColor: string
  aliases: string[]
  dbSubject: string
}

const WEEKLY_GOAL = 5

const SUBJECTS: SubjectConfig[] = [
  { key: 'english', label: 'English Language', icon: BookOpen, color: 'text-sky-400', barColor: 'bg-sky-400', aliases: ['english', 'reading', 'language arts'], dbSubject: 'Reading' },
  { key: 'mathematics', label: 'Mathematics', icon: Calculator, color: 'text-amber-400', barColor: 'bg-amber-400', aliases: ['math', 'mathematics'], dbSubject: 'Math' },
  { key: 'science', label: 'Science', icon: FlaskConical, color: 'text-emerald-400', barColor: 'bg-emerald-400', aliases: ['science'], dbSubject: 'Science' },
  { key: 'socialStudies', label: 'Social Studies', icon: Globe2, color: 'text-rose-400', barColor: 'bg-rose-400', aliases: ['history', 'social studies'], dbSubject: 'History' },
]

function matchesSubject(taskSubject: string, aliases: string[]): boolean {
  return aliases.includes(taskSubject.trim().toLowerCase())
}

export default function SubjectProgress({ tasks, theme, isSpace, childId, onTasksChange }: SubjectProgressProps) {
  const { t } = useI18n()
  const [newTask, setNewTask] = useState<Record<SubjectKey, string>>({
    english: '',
    mathematics: '',
    science: '',
    socialStudies: '',
  })
  const [adding, setAdding] = useState<SubjectKey | null>(null)

  const completedTasks = tasks.filter((task) => task.status === 'completed')

  const addTask = async (subject: SubjectConfig) => {
    const title = newTask[subject.key].trim()
    if (!title) return
    setAdding(subject.key)
    await supabase.from('tasks').insert({
      child_id: childId,
      title,
      subject: subject.dbSubject,
      duration_mins: 15,
      point_value: 1,
      status: 'pending',
      reward_id: null,
    })
    setNewTask((prev) => ({ ...prev, [subject.key]: '' }))
    setAdding(null)
    onTasksChange()
  }

  const toggleTask = async (task: Task) => {
    if (task.status === 'completed') {
      await supabase.from('tasks').update({ status: 'pending', completed_at: null }).eq('id', task.id)
    } else {
      await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', task.id)
    }
    onTasksChange()
  }

  return (
    <section className={`rounded-3xl p-4 ${theme.cardBg} border ${theme.cardBorder}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary}`}>{t('subjectProgress')}</h2>
          <p className={`text-xs font-semibold mt-1 ${theme.textMuted}`}>{t('weeklySubjectGoals')}</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold ${theme.accent}`}>
          <Star className="w-4 h-4 fill-current" />
          {t('halfStarsEveryTen')}
        </div>
      </div>

      <div className="space-y-5">
        {SUBJECTS.map((subject) => {
          const subjectTasks = tasks.filter((task) => matchesSubject(task.subject, subject.aliases))
          const completedLessons = subjectTasks.filter((task) => task.status === 'completed').length
          const percentage = Math.min(100, Math.round((completedLessons / WEEKLY_GOAL) * 100))
          const stars = Math.floor(percentage / 10) * 0.5
          const Icon = subject.icon
          const isAdding = adding === subject.key

          return (
            <div key={subject.key}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-4 h-4 ${subject.color}`} />
                <span className={`text-sm font-bold ${theme.textPrimary}`}>{subject.label}</span>
                <span className={`ml-auto text-xs font-bold ${theme.textMuted}`}>
                  {completedLessons}/{WEEKLY_GOAL} {t('lessons')}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-2.5 flex-1 rounded-full overflow-hidden ${isSpace ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${subject.barColor}`} style={{ width: `${percentage}%` }} />
                </div>
                <span className={`w-10 text-right text-xs font-bold ${theme.textSecondary}`}>{percentage}%</span>
                <span className={`w-14 flex items-center justify-end gap-1 text-xs font-bold ${theme.accent}`}>
                  <Star className="w-3.5 h-3.5 fill-current" /> {stars.toFixed(1)}
                </span>
              </div>

              {subjectTasks.length > 0 && (
                <div className="space-y-1 mb-2">
                  {subjectTasks.map((task) => {
                    const done = task.status === 'completed'
                    return (
                      <button
                        key={task.id}
                        onClick={() => toggleTask(task)}
                        className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 transition-all active:scale-[0.98] ${
                          done
                            ? isSpace ? 'bg-emerald-900/30' : 'bg-emerald-50'
                            : isSpace ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          done
                            ? 'bg-emerald-500 border-emerald-500'
                            : isSpace ? 'border-slate-500' : 'border-slate-300'
                        }`}>
                          {done && <Check className="w-3.5 h-3.5 text-white" />}
                        </span>
                        <span className={`text-sm font-semibold truncate text-left ${
                          done
                            ? 'line-through opacity-60 ' + theme.textMuted
                            : theme.textPrimary
                        }`}>
                          {task.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${isSpace ? 'bg-white/5' : 'bg-slate-50'}`}>
                <input
                  type="text"
                  value={newTask[subject.key]}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, [subject.key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTask(subject) }}
                  placeholder={t('addTaskPlaceholder')}
                  className={`flex-1 bg-transparent text-sm font-semibold outline-none ${theme.textPrimary} placeholder:${theme.textMuted}`}
                />
                <button
                  onClick={() => addTask(subject)}
                  disabled={!newTask[subject.key].trim() || isAdding}
                  className={`shrink-0 rounded-lg p-1.5 transition-all ${
                    newTask[subject.key].trim() && !isAdding
                      ? `${subject.barColor} text-white hover:scale-110 active:scale-90`
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
