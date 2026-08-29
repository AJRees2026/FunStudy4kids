import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Profile, type Task, type Reward, type ApprovalRequest, type WritingRank } from '../lib/supabase'

const RANK_LABEL_KEYS: Record<WritingRank, string> = {
  junior_author: 'rankJuniorAuthor',
  storyteller: 'rankStoryteller',
  master_storyteller: 'rankMasterStoryteller',
  master_wordsmith: 'rankMasterWordsmith',
  grand_chronicler: 'rankGrandChronicler',
  epic_author: 'rankEpicAuthor',
}
import { getTheme, type Theme } from '../lib/themes'
import { useI18n } from '../lib/i18n'
import PinPrompt from '../components/PinPrompt'
import FocusTimer from '../components/FocusTimer'
import Confetti from '../components/Confetti'
import SubjectProgress from '../components/SubjectProgress'
import ReadingJourney from '../components/ReadingJourney'
import BookReflections from '../components/BookReflections'
import MoodTracker from '../components/MoodTracker'
import HeightBoard from '../components/HeightBoard'
import {
  Star, Flame, Award, LogOut, Play, Check, Lock, Gift, Trophy,
  ClipboardList, X, Bell, Clock, BarChart3, Sparkles,
  ArrowLeft, BookMarked, ChevronRight, Smile, Ruler, PenLine,
} from 'lucide-react'

type Props = {
  child: Profile
  onSwitchProfile: () => void
}

export default function KidDashboard({ child, onSwitchProfile }: Props) {
  const { lang, t } = useI18n()
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [pinPrompt, setPinPrompt] = useState<{
    title: string
    subtitle: string
    onApprove: () => void
  } | null>(null)
  const [currentChild, setCurrentChild] = useState(child)
  const [approvalWaiting, setApprovalWaiting] = useState(false)
  const [cutoffNotified, setCutoffNotified] = useState(false)
  const cutoffCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [rewardPreview, setRewardPreview] = useState<Reward | null>(null)
  const [rewardCelebration, setRewardCelebration] = useState(false)
  const [view, setView] = useState<'home' | 'subjects' | 'reading' | 'tasks' | 'rewards' | 'mood' | 'growth'>('home')
  const [milestoneCelebration, setMilestoneCelebration] = useState<WritingRank | null>(null)

  const isSpace = currentChild.theme_preference === 'space'
  const theme: Theme = getTheme(currentChild.theme_preference)
  const guardianPin = currentChild.parent_pin || '1234'

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    const [{ data: taskData }, { data: rewardData }] = await Promise.all([
      supabase.from('tasks').select('*').eq('child_id', currentChild.id).order('created_at', { ascending: false }),
      supabase.from('rewards').select('*').eq('child_id', currentChild.id).order('created_at', { ascending: false }),
    ])
    if (taskData) setTasks(taskData as Task[])
    if (rewardData) setRewards(rewardData as Reward[])
  }, [currentChild.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-archive completed tasks daily
  useEffect(() => {
    if (!currentChild.auto_archive_daily) return
    const lastArchive = localStorage.getItem(`lastArchive_${currentChild.id}`)
    const today = new Date().toDateString()
    if (lastArchive !== today) {
      const completedTasks = tasks.filter((tk) => tk.status === 'completed')
      if (completedTasks.length > 0) {
        supabase.from('tasks').delete().in('id', completedTasks.map((tk) => tk.id))
          .then(() => {
            setTasks((prev) => prev.filter((tk) => tk.status === 'pending'))
            localStorage.setItem(`lastArchive_${currentChild.id}`, today)
          })
      } else {
        localStorage.setItem(`lastArchive_${currentChild.id}`, today)
      }
    }
  }, [currentChild.id, currentChild.auto_archive_daily, tasks])

  // Cutoff time notification check
  useEffect(() => {
    if (cutoffCheckRef.current) clearInterval(cutoffCheckRef.current)
    const checkCutoff = () => {
      const cutoff = currentChild.daily_cutoff_time || '18:00'
      const now = new Date()
      const [ch, cm] = cutoff.split(':').map(Number)
      const cutoffDate = new Date()
      cutoffDate.setHours(ch, cm, 0, 0)
      if (now >= cutoffDate && !cutoffNotified) {
        const pending = tasks.filter((tk) => tk.status === 'pending')
        if (pending.length > 0) {
          setCutoffNotified(true)
          const msg = t('homeworkIncomplete')
          showToast(msg)
        }
      }
      if (now < cutoffDate) {
        setCutoffNotified(false)
      }
    }
    cutoffCheckRef.current = setInterval(checkCutoff, 60000)
    checkCutoff()
    return () => { if (cutoffCheckRef.current) clearInterval(cutoffCheckRef.current) }
  }, [currentChild.daily_cutoff_time, tasks, cutoffNotified, lang, t])

  const executeCompleteTask = async (task: Task) => {
    await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', task.id)

    const newPoints = currentChild.points + task.point_value
    await supabase.from('profiles').update({ points: newPoints }).eq('id', currentChild.id)
    setCurrentChild({ ...currentChild, points: newPoints })

    setTasks((prev) => prev.map((tk) => tk.id === task.id ? { ...tk, status: 'completed', completed_at: new Date().toISOString() } : tk))
    setConfetti(true)
    setTimeout(() => setConfetti(false), 100)

    const congrats = `${t('greatJob')}, ${currentChild.child_name || currentChild.name}! ${t('youEarned')} ${task.point_value} ${isSpace ? t('fuelCells') : t('sparkles')}!`
    showToast(congrats)
  }

  const completeTask = async (task: Task) => {
    const mode = currentChild.task_approval_mode
    if (mode === 'in_person_pin') {
      setPinPrompt({
        title: t('approveTask'),
        subtitle: `${t('enterPinToComplete')} "${task.title}"`,
        onApprove: () => { setPinPrompt(null); executeCompleteTask(task) },
      })
      return
    }
    if (mode === 'remote_notification') {
      setApprovalWaiting(true)
      const { data: parent } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentChild.linked_parent_id || '')
        .maybeSingle()

      if (parent) {
        await supabase.from('approval_requests').insert({
          child_id: currentChild.id,
          parent_id: (parent as any).id,
          task_id: task.id,
          task_title: task.title,
          point_value: task.point_value,
          status: 'pending',
        })
      }
      showToast(t('approvalSent'))

      const startTime = Date.now()
      const checkApproval = setInterval(async () => {
        const { data: req } = await supabase
          .from('approval_requests')
          .select('status')
          .eq('task_id', task.id)
          .eq('child_id', currentChild.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const status = (req as any)?.status
        if (status === 'approved') {
          clearInterval(checkApproval)
          setApprovalWaiting(false)
          executeCompleteTask(task)
        } else if (status === 'denied') {
          clearInterval(checkApproval)
          setApprovalWaiting(false)
          showToast(t('approvalDenied'))
        } else if (Date.now() - startTime > 120000) {
          clearInterval(checkApproval)
          setApprovalWaiting(false)
          showToast(t('approvalDenied'))
        }
      }, 3000)
      return
    }
    executeCompleteTask(task)
  }

  const executeClaimReward = async (reward: Reward) => {
    const newPoints = currentChild.points - reward.point_cost
    await supabase
      .from('rewards')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', reward.id)
    await supabase.from('profiles').update({ points: newPoints }).eq('id', currentChild.id)
    setCurrentChild({ ...currentChild, points: newPoints })
    setRewards((prev) => prev.map((r) => r.id === reward.id ? { ...r, status: 'claimed', claimed_at: new Date().toISOString() } : r))
    showToast(`"${reward.title}" ${t('claimed')}! ${theme.emoji}`)
  }

  const claimReward = async (reward: Reward) => {
    if (currentChild.points < reward.point_cost) {
      showToast(`${t('notEnough')} ${isSpace ? t('fuelCells') : t('sparkles')} ${t('keepStudying')} ${theme.emoji}`)
      return
    }
    if (currentChild.require_pin_for_rewards) {
      setPinPrompt({
        title: t('approveReward'),
        subtitle: `${t('enterPinToClaim')} "${reward.title}"`,
        onApprove: () => { setPinPrompt(null); executeClaimReward(reward) },
      })
      return
    }
    executeClaimReward(reward)
  }

  const pendingTasks = tasks.filter((tk) => tk.status === 'pending')
  const completedTasks = tasks.filter((tk) => tk.status === 'completed')
  const availableRewards = rewards.filter((r) => r.status === 'available')
  const claimedRewards = rewards.filter((r) => r.status === 'claimed')
  const totalTasks = tasks.length
  const completedCount = completedTasks.length
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0
  const displayMode = currentChild.progress_display_mode || 'percentage'

  const renderProgress = () => {
    if (totalTasks === 0) return null

    if (displayMode === 'percentage') {
      return (
        <div className={`rounded-2xl p-4 ${theme.cardBg} border ${theme.cardBorder}`}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className={`w-4 h-4 ${theme.accent}`} />
            <span className={`text-sm font-bold ${theme.textSecondary}`}>{progressPct}%</span>
          </div>
          <div className={`h-3 rounded-full overflow-hidden ${isSpace ? 'bg-[#8d7bea]/30' : 'bg-slate-200'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )
    }

    if (displayMode === 'task_count') {
      return (
        <div className={`rounded-2xl p-4 ${theme.cardBg} border ${theme.cardBorder}`}>
          <div className="flex items-center gap-2">
            <Check className={`w-4 h-4 text-teal-400`} />
            <span className={`font-display font-bold text-lg ${theme.textPrimary}`}>
              {completedCount} {t('ofDone')} {totalTasks} {t('done')}
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden mt-2 ${isSpace ? 'bg-[#8d7bea]/30' : 'bg-slate-200'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-green-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )
    }

    // theme_gauge
    const gaugeLabel = isSpace ? t('cosmicFuel') : t('rainbowMeter')
    const gaugeEmoji = isSpace ? '🚀' : '🌈'
    return (
      <div className={`rounded-2xl p-4 ${theme.cardBg} border ${theme.cardBorder}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{gaugeEmoji}</span>
          <span className={`text-sm font-bold ${theme.textSecondary}`}>{gaugeLabel}</span>
          <span className={`text-sm font-bold ${theme.accent} ml-auto`}>{progressPct}%</span>
        </div>
        <div className={`h-4 rounded-full overflow-hidden ${isSpace ? 'bg-[#8d7bea]/30 border border-[#8d7bea]/40' : 'bg-slate-100 border border-slate-200'}`}>
          {isSpace ? (
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-all duration-500 flex items-center justify-end pr-1"
              style={{ width: `${Math.max(progressPct, 8)}%` }}
            >
              {progressPct > 15 && <span className="text-[10px]">⚡</span>}
            </div>
          ) : (
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(progressPct, 8)}%`,
                background: 'linear-gradient(to right, #f43f5e, #f59e0b, #eab308, #22c55e, #06b6d4, #8b5cf6)',
              }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen ${theme.bgGradient} pb-24 relative`}
      style={{ backgroundImage: `url(${isSpace ? '/bg-space2.png' : '/bg-unicorn1.png'})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      {isSpace && <div className="absolute inset-0 bg-[#1d173b]/40 pointer-events-none" />}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b relative ${isSpace ? 'bg-[#1d173b]/60 border-white/10' : 'bg-black/20 border-white/5'}`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-xl shadow-lg overflow-hidden">
              {currentChild.photo_url ? <img src={currentChild.photo_url} alt={currentChild.child_name || currentChild.name} className="w-full h-full object-cover" /> : theme.emoji}
            </div>
            <div>
              <p className={`font-display font-bold ${theme.textPrimary} text-lg leading-none flex items-center gap-2`}>
                {currentChild.child_name || currentChild.name}
                {currentChild.writing_rank && ['master_storyteller', 'master_wordsmith', 'grand_chronicler', 'epic_author'].includes(currentChild.writing_rank) && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 shadow-sm">
                    <PenLine className="w-3 h-3" />
                    {t(RANK_LABEL_KEYS[currentChild.writing_rank as WritingRank])}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1 text-s font-bold ${theme.accent}`}>
                  <Star className="w-3 h-3" /> {currentChild.points} {isSpace ? t('fuelCells') : t('sparkles')}
                </span>
                <span className={`flex items-center gap-1 text-s font-bold ${theme.textMuted}`}>
                  <Flame className="w-3 h-3" /> {currentChild.streak || 0} {t('dayStreak')}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onSwitchProfile} className={`p-2 rounded-xl ${theme.textMuted} hover:${theme.textPrimary} transition-colors`}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Progress Display */}
        {renderProgress()}

        {/* Home / Index View */}
        {view === 'home' && (
          <section className="animate-fadeIn">
            <div className="text-center mb-6">
              <h2 className={`font-display font-extrabold text-2xl ${theme.textPrimary} mb-1`}>{t('exploreActivities')}</h2>
              <p className={`text-sm font-semibold ${theme.textMuted}`}>{t('chooseActivity')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setView('mood')}
                className={`group rounded-3xl p-5 ${theme.cardBg} border ${theme.cardBorder} text-left transition-all hover:scale-[1.03] active:scale-95`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-rose-500 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Smile className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-display font-extrabold text-xl text-[#df5a00] mb-1`}>{t('moodTracker')}</h3>
                <p className={`text-sm font-semibold text-[#4169e1] leading-snug`}>{t('moodTrackerDesc')}</p>
                 <div className="hidden">
                  {t('moodTracker')} <ChevronRight className="w-3 h-3" />
                </div>
              </button>

              <button
                onClick={() => setView('subjects')}
                className={`group rounded-3xl p-5 ${theme.cardBg} border ${theme.cardBorder} text-left transition-all hover:scale-[1.03] active:scale-95`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-display font-extrabold text-xl text-[#df5a00] mb-1`}>{t('subjectProgress')}</h3>
                <p className={`text-sm font-semibold text-[#4169e1] leading-snug`}>{t('progressBySubjectDesc')}</p>
                 <div className="hidden">
                  {t('subjectProgress')} <ChevronRight className="w-3 h-3" />
                </div>
              </button>

              <button
                onClick={() => setView('reading')}
                className={`group rounded-3xl p-5 ${theme.cardBg} border ${theme.cardBorder} text-left transition-all hover:scale-[1.03] active:scale-95`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-500 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <BookMarked className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-display font-extrabold text-lg text-[#df5a00] mb-1`}>{t('readingJourney')}</h3>
                <p className={`text-sm font-semibold text-[#4169e1] leading-snug`}>{t('readingJourneyDesc')}</p>
                  <div className="hidden">
                  {t('readingJourney')} <ChevronRight className="w-3 h-3" />
                </div>
              </button>

              <button
                onClick={() => setView('tasks')}
                className={`group rounded-3xl p-5 ${theme.cardBg} border ${theme.cardBorder} text-left transition-all hover:scale-[1.03] active:scale-95 relative`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 text-white fill-white" />
                </div>
                <h3 className={`font-display font-extrabold text-lg text-[#df5a00] mb-1`}>{t('sparkJobs')}</h3>
                <p className={`text-sm font-semibold text-[#4169e1] leading-snug`}>{t('tasksDesc')}</p>
                  <div className="hidden">
                  {t('sparkJobs')} <ChevronRight className="w-3 h-3" />
                </div>
                {pendingTasks.length > 0 && (
                  <span className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-md">
                    {pendingTasks.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setView('growth')}
                className={`group rounded-3xl p-5 ${theme.cardBg} border ${theme.cardBorder} text-left transition-all hover:scale-[1.03] active:scale-95`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Ruler className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-display font-extrabold text-lg text-[#df5a00] mb-1`}>{t('howMuchIVeGrown')}</h3>
                <p className={`text-sm font-semibold text-[#4169e1] leading-snug`}>{t('growthDesc')}</p>
                <div className="hidden">
                  {t('growthChart')} <ChevronRight className="w-3 h-3" />
                </div>
              </button>

              <button
                onClick={() => setView('rewards')}
                className={`group rounded-3xl p-5 ${theme.cardBg} border ${theme.cardBorder} text-left transition-all hover:scale-[1.03] active:scale-95 relative`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Gift className="w-6 h-6 text-white" />
                </div>
<h3 className="sparkle-title font-display font-extrabold text-lg mb-1">
  {t('rewardShop')}
</h3>
                <p className={`text-sm font-semibold text-[#4169e1] leading-snug`}>{t('rewardShopDesc')}</p>
                <div className="hidden">
                  {t('rewardShop')} <ChevronRight className="w-3 h-3" />
                </div>
                {availableRewards.length > 0 && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-md">
                    {availableRewards.length}
                  </span>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Back Button for sub-views */}
        {view !== 'home' && (
          <button
            onClick={() => setView('home')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-display font-bold text-sm ${theme.cardBg} border ${theme.cardBorder} ${theme.textSecondary} transition-all hover:scale-105 active:scale-95`}
          >
            <ArrowLeft className="w-4 h-4" /> {t('backToHome')}
          </button>
        )}

        {/* Mood Tracker View */}
        {view === 'mood' && (
          <div className="animate-fadeIn">
            <MoodTracker childId={currentChild.id} theme={theme} isSpace={isSpace} />
          </div>
        )}

        {/* Growth / Growth Chart View */}
        {view === 'growth' && (
          <div className="animate-fadeIn -mx-4 -my-6">
            <HeightBoard
              childId={currentChild.id}
              childName={currentChild.child_name || currentChild.name}
              photoUrl={currentChild.photo_url}
              isSpace={isSpace}
              theme={theme}
              onBack={() => setView('home')}
            />
          </div>
        )}

        {/* Subject Progress View */}
        {view === 'subjects' && (
          <div className="animate-fadeIn">
            <SubjectProgress tasks={tasks} theme={theme} isSpace={isSpace} childId={currentChild.id} onTasksChange={fetchData} />
          </div>
        )}

        {/* Reading Journey View */}
        {view === 'reading' && (
          <div className="animate-fadeIn space-y-4">
            <ReadingJourney childId={currentChild.id} theme={theme} isSpace={isSpace} onStarsAwarded={(count) => {
              const newPoints = currentChild.points + count
              supabase.from('profiles').update({ points: newPoints }).eq('id', currentChild.id)
              setCurrentChild({ ...currentChild, points: newPoints })
              setConfetti(true)
              setTimeout(() => setConfetti(false), 100)
              showToast(`${t('greatJob')}! ${count} ${isSpace ? t('fuelCells') : t('sparkles')}!`)
            }} />
            <BookReflections
              childId={currentChild.id}
              theme={theme}
              isSpace={isSpace}
              onPointsAwarded={(count) => {
                const newPoints = currentChild.points + count
                supabase.from('profiles').update({ points: newPoints }).eq('id', currentChild.id)
                setCurrentChild({ ...currentChild, points: newPoints })
              }}
              onMilestoneReached={(rank) => {
                setConfetti(true)
                setTimeout(() => setConfetti(false), 100)
                setMilestoneCelebration(rank)
                setTimeout(() => setMilestoneCelebration(null), 4000)
              }}
            />
          </div>
        )}

        {/* Tasks View */}
        {view === 'tasks' && (
        <>
        <section className="animate-fadeIn">
          <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary} mb-3 flex items-center gap-2`}>
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            {t('tasks')}
            <span className={`text-sm font-bold ${theme.textMuted} bg-white/5 px-2 py-0.5 rounded-full`}>
              {pendingTasks.length}
            </span>
          </h2>
          {pendingTasks.length === 0 ? (
            <div className={`rounded-2xl p-6 text-center ${theme.cardBg} border ${theme.cardBorder}`}>
              <p className={`font-display font-bold ${theme.textSecondary}`}>{t('noTasksYet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => {
                const linkedReward = task.reward_id ? rewards.find((r) => r.id === task.reward_id) : null
                return (
                <div key={task.id} className={`rounded-2xl p-4 ${theme.cardBg} border ${theme.cardBorder}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className={`font-display font-bold ${theme.textPrimary} text-lg truncate`}>
                          {task.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isSpace ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          {task.subject}
                        </span>
                        <span className={`text-xs font-bold ${theme.textMuted}`}>{task.duration_mins} {t('minutes')}</span>
                        <span className={`text-xs font-bold ${theme.accent} flex items-center gap-0.5`}>
                          <Star className="w-3 h-3" /> {task.point_value}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTask(task)}
                      className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-4 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Play className="w-4 h-4" /> {t('start')}
                    </button>
                  </div>
                  {linkedReward && (
                    <button
                      onClick={() => { setRewardPreview(linkedReward); setRewardCelebration(true); setTimeout(() => setRewardCelebration(false), 2000) }}
                      className={`mt-3 w-full flex items-center gap-2 rounded-xl px-3 py-2 border transition-all hover:scale-[1.01] active:scale-95 ${
                        isSpace
                          ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
                          : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <span className="relative flex-shrink-0">
                        <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" />
                        <span className="relative w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <Gift className="w-4 h-4 text-white" />
                        </span>
                      </span>
                      <span className={`text-sm font-bold ${isSpace ? 'text-amber-300' : 'text-amber-600'}`}>
                        {t('rewardBadge')}: {linkedReward.title}
                      </span>
                      <span className={`text-xs font-semibold ml-auto ${isSpace ? 'text-amber-400/70' : 'text-amber-500'}`}>
                        {t('tapToPreview')}
                      </span>
                    </button>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <section>
            <h2 className={`font-display font-extrabold text-lg ${theme.textPrimary} mb-3 flex items-center gap-2`}>
              <Check className="w-5 h-5 text-teal-400" />
              {t('completed')}
              <span className={`text-sm font-bold ${theme.textMuted} bg-white/5 px-2 py-0.5 rounded-full`}>
                {completedTasks.length}
              </span>
            </h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div key={task.id} className={`rounded-xl p-3 ${theme.cardBg} border ${theme.cardBorder} flex items-center gap-2 opacity-70`}>
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <h3 className={`font-display font-bold ${theme.textSecondary} text-sm truncate`}>
                      {task.title}
                    </h3>
                  </div>
                  <span className={`text-xs font-bold ${theme.accent} flex items-center gap-0.5`}>
                    +{task.point_value} <Star className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
        </>
        )}

        {/* Reward Shop View */}
        {view === 'rewards' && (
        <>
        <section className="animate-fadeIn">
          <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary} mb-3 flex items-center gap-2`}>
            <Gift className="w-5 h-5 text-red-500" />
            {t('rewardShop')}
          </h2>
          {availableRewards.length === 0 ? (
            <div className={`rounded-2xl p-6 text-center ${theme.cardBg} border ${theme.cardBorder}`}>
              <p className={`font-display font-bold ${theme.textSecondary}`}>{t('noRewardsYet')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableRewards.map((reward) => {
                const canAfford = currentChild.points >= reward.point_cost
                return (
                  <div key={reward.id} className={`rounded-2xl p-4 ${theme.cardBg} border ${theme.cardBorder} flex flex-col items-center text-center`}>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <h3 className={`font-display font-bold ${theme.textPrimary} text-sm`}>
                        {reward.title}
                      </h3>
                    </div>
                    <p className={`text-xs font-bold ${theme.accent} flex items-center gap-0.5 mb-3`}>
                      <Star className="w-3 h-3" /> {reward.point_cost}
                    </p>
                    <button
                      onClick={() => claimReward(reward)}
                      disabled={!canAfford}
                      className={`w-full font-display font-bold text-sm py-2 rounded-xl transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:scale-105 active:scale-95'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? t('claim') : `${t('need')} ${reward.point_cost - currentChild.points} ${t('more')}`}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Claimed Rewards */}
        {claimedRewards.length > 0 && (
          <section>
            <h2 className={`font-display font-extrabold text-lg ${theme.textPrimary} mb-3`}>
              {t('claimedRewards')}
            </h2>
            <div className="space-y-2">
              {claimedRewards.map((reward) => (
                <div key={reward.id} className={`rounded-xl p-3 ${theme.cardBg} border ${theme.cardBorder} flex items-center gap-2 opacity-70`}>
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <h3 className={`font-display font-bold ${theme.textSecondary} text-sm truncate`}>
                      {reward.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        </>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs">
          <div className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-5 py-3 rounded-2xl shadow-2xl animate-pop">
            {toast}
          </div>
        </div>
      )}

      {/* Approval Waiting Modal */}
      {approvalWaiting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className={`rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-pop ${
            isSpace ? 'bg-[#fffaf2] border border-[#8d7bea]/60' : 'bg-white'
          }`}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 mb-4">
              <Bell className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <h2 className={`font-display font-extrabold text-xl mb-2 ${theme.textPrimary}`}>
              {t('approvalPending')}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Clock className={`w-5 h-5 animate-pulse ${theme.textMuted}`} />
              <p className={`text-sm font-semibold ${theme.textMuted}`}>...</p>
            </div>
          </div>
        </div>
      )}

      {/* Confetti */}
      {confetti && <Confetti />}

      {/* Focus Timer Modal */}
      {activeTask && !approvalWaiting && (
        <FocusTimer
          durationMins={activeTask.duration_mins}
          onDone={() => { completeTask(activeTask); setActiveTask(null) }}
          onClose={() => setActiveTask(null)}
          isSpace={isSpace}
        />
      )}

      {/* Guardian PIN Prompt */}
      {pinPrompt && (
        <PinPrompt
          title={pinPrompt.title}
          subtitle={pinPrompt.subtitle}
          expectedPin={guardianPin}
          isSpace={isSpace}
          onSuccess={pinPrompt.onApprove}
          onCancel={() => setPinPrompt(null)}
        />
      )}

      {/* Reward Preview Modal */}
      {rewardPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setRewardPreview(null)}>
          <div
            className={`rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-pop relative overflow-hidden ${
              isSpace ? 'bg-[#fffaf2] border border-[#8d7bea]/60' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {rewardCelebration && (
              <>
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(12)].map((_, i) => (
                    <span
                      key={i}
                      className="absolute text-2xl animate-bounce"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s',
                      }}
                    >
                      {['⭐', '🎉', '✨', '🌟', '💫'][i % 5]}
                    </span>
                  ))}
                </div>
                {confetti && <Confetti />}
              </>
            )}
            <div className="relative">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 ${
                rewardCelebration ? 'bg-gradient-to-br from-amber-400 to-orange-500 scale-110 animate-pulse' : 'bg-amber-500/20'
              } transition-all duration-500`}>
                <Gift className={`w-10 h-10 ${rewardCelebration ? 'text-white' : 'text-red-500'}`} />
              </div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isSpace ? 'text-amber-500' : 'text-amber-500'}`}>
                {t('previewReward')}
              </p>
              <h2 className={`font-display font-extrabold text-2xl mb-3 ${theme.textPrimary}`}>
                {rewardPreview.title}
              </h2>
              <p className={`text-sm font-semibold mb-4 ${theme.textMuted}`}>
                {t('youWillEarn')} <span className={`font-bold ${isSpace ? 'text-amber-600' : 'text-amber-600'}`}>{rewardPreview.title}</span>
                <br />{t('forCompleting')} {t('tasks').toLowerCase()}
              </p>
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className={`flex items-center gap-1 text-lg font-bold ${theme.accent}`}>
                  <Star className="w-5 h-5" /> {rewardPreview.point_cost} {t('pointsLower')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setRewardCelebration(true); setTimeout(() => setRewardCelebration(false), 2000) }}
                  className={`flex-1 font-display font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
                    isSpace
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> {t('previewReward')}
                </button>
                <button
                  onClick={() => setRewardPreview(null)}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {milestoneCelebration && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setMilestoneCelebration(null)}>
          <div className={`rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-pop ${isSpace ? 'bg-[#fffaf2] border border-[#8d7bea]/60' : 'bg-white'}`}>
            <div className="text-5xl mb-3">
              {milestoneCelebration === 'junior_author' && '📝'}
              {milestoneCelebration === 'storyteller' && '📖'}
              {milestoneCelebration === 'master_storyteller' && '✒️'}
              {milestoneCelebration === 'master_wordsmith' && '🌟'}
              {milestoneCelebration === 'grand_chronicler' && '🏅'}
              {milestoneCelebration === 'epic_author' && '🏆'}
            </div>
            <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary} mb-2`}>{t('milestoneUnlocked')}</h2>
            <p className={`font-display font-bold text-lg ${theme.accent}`}>
              {t(RANK_LABEL_KEYS[milestoneCelebration])}
            </p>
            <button
              onClick={() => setMilestoneCelebration(null)}
              className={`mt-6 w-full font-display font-bold py-3 rounded-2xl text-white bg-gradient-to-r ${theme.buttonGradient} hover:scale-[1.02] active:scale-95 transition-all`}
            >
              {t('continueToApp')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
