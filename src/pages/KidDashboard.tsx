import { useState, useEffect, useCallback } from 'react'
import { supabase, type Profile, type Task, type Reward } from '../lib/supabase'
import { getTheme, type Theme } from '../lib/themes'
import { speak, getSpeechLang, setSpeechLang, LANGUAGES } from '../lib/speech'
import SpeakButton from '../components/SpeakButton'
import PinPrompt from '../components/PinPrompt'
import FocusTimer from '../components/FocusTimer'
import Confetti from '../components/Confetti'
import {
  Star, Flame, Award, LogOut, Play, Check, Lock, ShoppingBag,
  ClipboardList, X, Volume2,
} from 'lucide-react'

type Props = {
  child: Profile
  onSwitchProfile: () => void
}

export default function KidDashboard({ child, onSwitchProfile }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [speechLang, setLang] = useState(getSpeechLang())
  const [pinPrompt, setPinPrompt] = useState<{
    title: string
    subtitle: string
    onApprove: () => void
  } | null>(null)
  const [currentChild, setCurrentChild] = useState(child)

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

  const executeCompleteTask = async (task: Task) => {
    await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', task.id)

    const newPoints = currentChild.points + task.point_value
    await supabase.from('profiles').update({ points: newPoints }).eq('id', currentChild.id)
    setCurrentChild({ ...currentChild, points: newPoints })

    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t))
    setConfetti(true)
    setTimeout(() => setConfetti(false), 100)

    const congrats = `Great job, ${currentChild.child_name || currentChild.name}! You earned ${task.point_value} ${theme.starLabel.toLowerCase()}!`
    speak(congrats, speechLang)
    showToast(congrats)
  }

  const completeTask = async (task: Task) => {
    if (currentChild.require_pin_for_tasks) {
      setPinPrompt({
        title: 'Approve Task',
        subtitle: `Enter PIN to complete "${task.title}"`,
        onApprove: () => { setPinPrompt(null); executeCompleteTask(task) },
      })
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
    showToast(`You claimed "${reward.title}"! ${theme.emoji}`)
  }

  const claimReward = async (reward: Reward) => {
    if (currentChild.points < reward.point_cost) {
      showToast(`Not enough ${theme.starLabel.toLowerCase()} yet! Keep studying! ${theme.emoji}`)
      return
    }
    if (currentChild.require_pin_for_rewards) {
      setPinPrompt({
        title: 'Approve Reward',
        subtitle: `Enter PIN to claim "${reward.title}"`,
        onApprove: () => { setPinPrompt(null); executeClaimReward(reward) },
      })
      return
    }
    executeClaimReward(reward)
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending')
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const availableRewards = rewards.filter((r) => r.status === 'available')
  const claimedRewards = rewards.filter((r) => r.status === 'claimed')

  return (
    <div className={`min-h-screen ${theme.bgGradient} pb-24`}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-xl shadow-lg">
              {currentChild.avatar || theme.emoji}
            </div>
            <div>
              <p className={`font-display font-bold ${theme.textPrimary} text-lg leading-none`}>
                {currentChild.child_name || currentChild.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1 text-xs font-bold ${theme.accent}`}>
                  <Star className="w-3 h-3" /> {currentChild.points} {theme.starLabel}
                </span>
                <span className={`flex items-center gap-1 text-xs font-bold ${theme.textMuted}`}>
                  <Flame className="w-3 h-3" /> {currentChild.streak || 0} day streak
                </span>
              </div>
            </div>
          </div>
          <button onClick={onSwitchProfile} className={`p-2 rounded-xl ${theme.textMuted} hover:${theme.textPrimary} transition-colors`}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Pending Tasks */}
        <section>
          <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary} mb-3 flex items-center gap-2`}>
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            Tasks
            <span className={`text-sm font-bold ${theme.textMuted} bg-white/5 px-2 py-0.5 rounded-full`}>
              {pendingTasks.length}
            </span>
          </h2>
          {pendingTasks.length === 0 ? (
            <div className={`rounded-2xl p-6 text-center ${theme.cardBg} border ${theme.cardBorder}`}>
              <p className={`font-display font-bold ${theme.textSecondary}`}>No tasks yet! Ask your parent to add some.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className={`rounded-2xl p-4 ${theme.cardBg} border ${theme.cardBorder} flex items-center gap-3`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className={`font-display font-bold ${theme.textPrimary} text-lg truncate`}>
                        {task.title}
                      </h3>
                      <SpeakButton text={task.title} lang={speechLang} iconSize={16} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isSpace ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {task.subject}
                      </span>
                      <span className={`text-xs font-bold ${theme.textMuted}`}>{task.duration_mins} min</span>
                      <span className={`text-xs font-bold ${theme.accent} flex items-center gap-0.5`}>
                        <Star className="w-3 h-3" /> {task.point_value}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTask(task)}
                    className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-4 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Play className="w-4 h-4" /> Start
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <section>
            <h2 className={`font-display font-extrabold text-lg ${theme.textPrimary} mb-3 flex items-center gap-2`}>
              <Check className="w-5 h-5 text-teal-400" />
              Completed
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
                    <SpeakButton text={task.title} lang={speechLang} iconSize={14} />
                  </div>
                  <span className={`text-xs font-bold ${theme.accent} flex items-center gap-0.5`}>
                    +{task.point_value} <Star className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reward Shop */}
        <section>
          <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary} mb-3 flex items-center gap-2`}>
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            Reward Shop
          </h2>
          {availableRewards.length === 0 ? (
            <div className={`rounded-2xl p-6 text-center ${theme.cardBg} border ${theme.cardBorder}`}>
              <p className={`font-display font-bold ${theme.textSecondary}`}>No rewards available yet!</p>
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
                      <SpeakButton text={reward.title} lang={speechLang} iconSize={14} />
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
                      {canAfford ? 'Claim' : `Need ${reward.point_cost - currentChild.points} more`}
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
              Claimed Rewards
            </h2>
            <div className="space-y-2">
              {claimedRewards.map((reward) => (
                <div key={reward.id} className={`rounded-xl p-3 ${theme.cardBg} border ${theme.cardBorder} flex items-center gap-2 opacity-70`}>
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <h3 className={`font-display font-bold ${theme.textSecondary} text-sm truncate`}>
                      {reward.title}
                    </h3>
                    <SpeakButton text={reward.title} lang={speechLang} iconSize={14} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Language Selector */}
      <div className="fixed bottom-4 left-4 z-20">
        <select
          value={speechLang}
          onChange={(e) => { setLang(e.target.value); setSpeechLang(e.target.value) }}
          className={`rounded-xl px-3 py-2 text-sm font-bold ${theme.cardBg} ${theme.textPrimary} border ${theme.cardBorder} focus:outline-none`}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
          ))}
        </select>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs">
          <div className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-5 py-3 rounded-2xl shadow-2xl animate-pop">
            {toast}
          </div>
        </div>
      )}

      {/* Confetti */}
      {confetti && <Confetti />}

      {/* Focus Timer Modal */}
      {activeTask && (
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
    </div>
  )
}
