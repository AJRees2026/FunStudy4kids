import { BookOpen, Calculator, FlaskConical, Globe as Globe2, Star } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import type { Task } from '../lib/supabase'
import type { Theme } from '../lib/themes'

type SubjectKey = 'english' | 'mathematics' | 'science' | 'socialStudies'

type SubjectProgressProps = {
  tasks: Task[]
  theme: Theme
  isSpace: boolean
}

type SubjectConfig = {
  key: SubjectKey
  label: string
  icon: typeof BookOpen
  color: string
  aliases: string[]
}

const WEEKLY_GOAL = 5

const SUBJECTS: SubjectConfig[] = [
  { key: 'english', label: 'English Language', icon: BookOpen, color: 'text-sky-400', aliases: ['english', 'reading', 'language arts'] },
  { key: 'mathematics', label: 'Mathematics', icon: Calculator, color: 'text-amber-400', aliases: ['math', 'mathematics'] },
  { key: 'science', label: 'Science', icon: FlaskConical, color: 'text-emerald-400', aliases: ['science'] },
  { key: 'socialStudies', label: 'Social Studies', icon: Globe2, color: 'text-rose-400', aliases: ['history', 'social studies', 'social studies'] },
]

function matchesSubject(taskSubject: string, aliases: string[]): boolean {
  return aliases.includes(taskSubject.trim().toLowerCase())
}

export default function SubjectProgress({ tasks, theme, isSpace }: SubjectProgressProps) {
  const { t } = useI18n()
  const completedTasks = tasks.filter((task) => task.status === 'completed')

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

      <div className="space-y-4">
        {SUBJECTS.map((subject) => {
          const completedLessons = completedTasks.filter((task) => matchesSubject(task.subject, subject.aliases)).length
          const percentage = Math.min(100, Math.round((completedLessons / WEEKLY_GOAL) * 100))
          const stars = Math.floor(percentage / 10) * 0.5
          const Icon = subject.icon

          return (
            <div key={subject.key}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-4 h-4 ${subject.color}`} />
                <span className={`text-sm font-bold ${theme.textPrimary}`}>{subject.label}</span>
                <span className={`ml-auto text-xs font-bold ${theme.textMuted}`}>
                  {completedLessons}/{WEEKLY_GOAL} {t('lessons')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`h-2.5 flex-1 rounded-full overflow-hidden ${isSpace ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${subject.color.replace('text-', 'bg-')}`} style={{ width: `${percentage}%` }} />
                </div>
                <span className={`w-10 text-right text-xs font-bold ${theme.textSecondary}`}>{percentage}%</span>
                <span className={`w-14 flex items-center justify-end gap-1 text-xs font-bold ${theme.accent}`}>
                  <Star className="w-3.5 h-3.5 fill-current" /> {stars.toFixed(1)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
