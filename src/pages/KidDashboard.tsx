import { useState, useEffect, useCallback } from 'react'
import {
  supabase, type Profile, type Task, type Reward, type Outfit, type ChildOutfit,
} from '../lib/supabase'
import { THEMES, getTheme, getOutfit } from '../lib/themes'
import { speak, setSpeechLang, getSpeechLang, isSpeechSupported } from '../lib/tts'
import Avatar from '../components/Avatar'
import Confetti from '../components/Confetti'
import FocusTimer from '../components/FocusTimer'
import SpeakButton from '../components/SpeakButton'
import PinPrompt from '../components/PinPrompt'
import {
  Star, Flame, Award, LogOut, Play, Check, Lock, ShoppingBag,
  ClipboardList, Shirt, X, Volume2,
} from 'lucide-react'

const LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'it-IT', label: 'Italiano' },
]

type Tab = 'tasks' | 'shop' | 'outfits'

export default function KidDashboard({
  child,
  onExit,
  onRefreshChild,
}: {
  child: Profile
  onExit: () => void
  onRefreshChild: (id: string) => void
}) {
  const [tab, setTab] = useState<Tab>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [childOutfits, setChildOutfits] = useState<ChildOutfit[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [speechLang, setLang] = useState(getSpeechLang())
  const [pinPrompt, setPinPrompt] = useState<{
    title: string
    subtitle: string
    onApprove: () => void
  } | null>(null)

  const guardianPin = child.parent_pin || '1234'

  const theme = getTheme(child)
  const isSpace = theme.name === 'space'

  const loadData = useCallback(async () => {
    const [tasksRes, rewardsRes, outfitsRes, childOutfitsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('child_id', child.id).order('due_date'),
      supabase.from('rewards').select('*').eq('child_id', child.id).order('point_cost'),
      supabase.from('outfits').select('*').order('point_cost'),
      supabase.from('child_outfits').select('*').eq('child_id', child.id),
    ])
    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    if (rewardsRes.data) setRewards(rewardsRes.data as Reward[])
    if (outfitsRes.data) setOutfits(outfitsRes.data as Outfit[])
    if (childOutfitsRes.data) setChildOutfits(childOutfitsRes.data as ChildOutfit[])
  }, [child.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const equippedOutfit = getOutfit(outfits, child.active_outfit_id)

  const isOutfitUnlocked = (outfitId: string) =>
    childOutfits.some((co) => co.outfit_id === outfitId && co.is_unlocked)

  const completeTask = async (task: Task) => {
    if (child.require_pin_for_tasks) {
      setPinPrompt({
        title: 'Approve Task',
        subtitle: `Enter PIN to complete "${task.title}"`,
        onApprove: () => { setPinPrompt(null); executeCompleteTask(task) },
      })
      return
    }
    executeCompleteTask(task)
  }

  const executeCompleteTask = async (task: Task) => {
    await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', task.id)

    await supabase.from('study_sessions').insert({
      child_id: child.id,
      task_id: task.id,
      subject: task.subject,
      duration_mins: task.duration_mins,
    })

    const newPoints = child.points + task.points_value
    const newLevel = Math.floor(newPoints / 50) + 1
    await supabase
      .from('profiles')
      .update({ points: newPoints, level: newLevel })
      .eq('id', child.id)

    setConfetti(true)
    setTimeout(() => setConfetti(false), 100)
    setActiveTask(null)
    showToast(`+${task.points_value} ${theme.starLabel} earned! ${theme.emoji}`)

    // Auto-speak congratulations
    const childName = child.child_name || child.name
    const congratsMsgs: Record<string, string> = {
      'en-US': `Great job, ${childName}! You earned ${task.points_value} ${theme.starLabel.toLowerCase()}!`,
      'es-ES': `¡Buen trabajo, ${childName}! Ganaste ${task.points_value} ${theme.starLabel.toLowerCase()}!`,
      'fr-FR': `Bravo, ${childName}! Tu as gagné ${task.points_value} ${theme.starLabel.toLowerCase()}!`,
      'de-DE': `Gut gemacht, ${childName}! Du hast ${task.points_value} ${theme.starLabel.toLowerCase()} verdient!`,
      'pt-BR': `Muito bem, ${childName}! Você ganhou ${task.points_value} ${theme.starLabel.toLowerCase()}!`,
      'it-IT': `Bravo, ${childName}! Hai guadagnato ${task.points_value} ${theme.starLabel.toLowerCase()}!`,
    }
    speak(congratsMsgs[speechLang] || congratsMsgs['en-US'], speechLang)

    await loadData()
    await onRefreshChild(child.id)
  }

  const claimReward = async (reward: Reward) => {
    if (child.points < reward.point_cost) {
      showToast(`Not enough ${theme.starLabel.toLowerCase()} yet! Keep studying! ${theme.emoji}`)
      return
    }
    if (child.require_pin_for_rewards) {
      setPinPrompt({
        title: 'Approve Reward',
        subtitle: `Enter PIN to claim "${reward.title}"`,
        onApprove: () => { setPinPrompt(null); executeClaimReward(reward) },
      })
      return
    }
    executeClaimReward(reward)
  }

  const executeClaimReward = async (reward: Reward) => {
    const newPoints = child.points - reward.point_cost
    await supabase
      .from('rewards')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', reward.id)
    await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', child.id)
    showToast('Reward claimed! Ask a parent to approve. 🎁')
    await loadData()
    await onRefreshChild(child.id)
  }

  const unlockOutfit = async (outfit: Outfit) => {
    if (child.points < outfit.point_cost) {
      showToast(`Need ${outfit.point_cost - child.points} more ${theme.starLabel.toLowerCase()}!`)
      return
    }
    const newPoints = child.points - outfit.point_cost
    await supabase
      .from('child_outfits')
      .update({ is_unlocked: true, unlocked_at: new Date().toISOString() })
      .eq('child_id', child.id)
      .eq('outfit_id', outfit.id)
    await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', child.id)
    showToast(`${outfit.title} unlocked! 🎉`)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 100)
    await loadData()
    await onRefreshChild(child.id)
  }

  const equipOutfit = async (outfit: Outfit) => {
    await supabase
      .from('profiles')
      .update({ active_outfit_id: outfit.id })
      .eq('id', child.id)
    showToast(`${outfit.title} equipped! ✨`)
    await loadData()
    await onRefreshChild(child.id)
  }

  const unequipOutfit = async () => {
    await supabase
      .from('profiles')
      .update({ active_outfit_id: null })
      .eq('id', child.id)
    showToast('Outfit removed.')
    await loadData()
    await onRefreshChild(child.id)
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending')
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const availableRewards = rewards.filter((r) => r.status === 'locked')
  const claimedRewards = rewards.filter((r) => r.status === 'claimed')

  const textPrimary = isSpace ? 'text-white' : 'text-slate-800'
  const textSecondary = isSpace ? 'text-slate-300' : 'text-slate-500'
  const textMuted = isSpace ? 'text-slate-400' : 'text-slate-400'
  const cardBorder = isSpace ? 'border border-slate-700/50' : 'border border-slate-100'

  return (
    <div className={`min-h-screen ${theme.bg} pb-24`}>
      <Confetti fire={confetti} />

      {/* Header */}
      <div className={`${theme.headerBg} backdrop-blur-md sticky top-0 z-30 px-4 py-3 shadow-sm`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              photoUrl={child.photo_url}
              outfit={equippedOutfit}
              size={56}
              ringClass={`ring-4 ${theme.ring} shadow-lg`}
            />
            <div>
              <p className={`text-xs ${textMuted} font-semibold`}>Welcome back,</p>
              <h1 className={`text-xl font-display font-extrabold ${textPrimary}`}>
                Hi, {child.child_name || child.name}!
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl ${
              isSpace ? 'bg-cyan-900/50' : 'bg-amber-100'
            }`}>
              <span className="text-base">{theme.starIcon}</span>
              <span className={`font-display font-extrabold text-lg ${
                isSpace ? 'text-cyan-300' : 'text-amber-700'
              }`}>{child.points}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl ${
              isSpace ? 'bg-indigo-900/50' : 'bg-indigo-100'
            }`}>
              <Award className={`w-5 h-5 ${isSpace ? 'text-indigo-400' : 'text-indigo-500'}`} />
              <span className={`font-display font-extrabold text-lg ${
                isSpace ? 'text-indigo-300' : 'text-indigo-700'
              }`}>{child.level}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl ${
              isSpace ? 'bg-rose-900/50' : 'bg-rose-100'
            }`}>
              <Flame className={`w-5 h-5 ${isSpace ? 'text-rose-400' : 'text-rose-500'}`} />
              <span className={`font-display font-extrabold text-lg ${
                isSpace ? 'text-rose-300' : 'text-rose-700'
              }`}>{child.streak}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Tab Switcher */}
        <div className={`flex gap-2 mb-5 rounded-2xl p-1.5 ${
          isSpace ? 'bg-slate-800/60' : 'bg-white/60'
        } backdrop-blur-sm`}>
          {([
            { key: 'tasks' as Tab, label: 'My Tasks', icon: ClipboardList },
            { key: 'shop' as Tab, label: 'Reward Shop', icon: ShoppingBag },
            { key: 'outfits' as Tab, label: 'Outfits', icon: Shirt },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-display font-bold text-sm transition-all ${
                tab === key
                  ? isSpace
                    ? 'bg-slate-700 text-cyan-300 shadow-md'
                    : 'bg-white text-indigo-600 shadow-md'
                  : textSecondary
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* ── Tasks Tab ── */}
        {tab === 'tasks' && (
          <div className="space-y-4">
            <div className={`${theme.streakBg} rounded-3xl p-4 text-white flex items-center justify-between animate-slideUp`}>
              <div>
                <p className="font-display font-bold text-lg">Daily Streak</p>
                <p className="text-white/80 text-sm">{child.streak} days in a row! Keep it up!</p>
              </div>
              <div className="text-5xl animate-wiggle">🔥</div>
            </div>

            <h2 className={`text-lg font-display font-bold ${textPrimary} px-1`}>
              My Tasks Today
            </h2>
            {pendingTasks.length === 0 && (
              <div className={`${theme.cardBg} ${cardBorder} rounded-3xl p-8 text-center`}>
                <div className="text-5xl mb-2">{theme.emoji}</div>
                <p className={`font-display font-bold ${textPrimary}`}>All tasks done! You're a star!</p>
              </div>
            )}
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className={`${theme.cardBg} ${cardBorder} rounded-3xl p-4 shadow-md hover:shadow-lg transition-all animate-slideUp`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-4xl flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl ${
                    isSpace ? 'bg-slate-700/50' : 'bg-slate-50'
                  }`}>
                    {task.icon_name}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className={`font-display font-bold ${textPrimary} text-lg truncate`}>
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
                      <span className={`text-xs font-bold ${textMuted}`}>{task.duration_mins} min</span>
                      <span className={`text-xs font-bold flex items-center gap-0.5 ${
                        isSpace ? 'text-cyan-400' : 'text-amber-600'
                      }`}>
                        {theme.starIcon} {task.points_value}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTask(task)}
                    className={`flex items-center gap-1.5 font-display font-bold px-4 py-3 rounded-2xl shadow-md hover:scale-105 active:scale-95 transition-all flex-shrink-0 ${
                      isSpace
                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white'
                        : 'bg-gradient-to-r from-teal-400 to-indigo-500 text-white'
                    }`}
                  >
                    <Play className="w-5 h-5 fill-white" />
                    Start
                  </button>
                </div>
              </div>
            ))}

            {completedTasks.length > 0 && (
              <>
                <h2 className={`text-lg font-display font-bold ${textSecondary} px-1 pt-2`}>
                  Completed Today ✅
                </h2>
                {completedTasks.map((task) => (
                  <div key={task.id} className={`${theme.cardBg} ${cardBorder} rounded-3xl p-4 shadow-sm opacity-60`}>
                    <div className="flex items-center gap-4">
                      <div className={`text-3xl flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl ${
                        isSpace ? 'bg-slate-700/50' : 'bg-green-50'
                      }`}>
                        {task.icon_name}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className={`font-display font-bold ${textSecondary} text-base truncate line-through`}>
                            {task.title}
                          </h3>
                          <SpeakButton text={task.title} lang={speechLang} iconSize={14} />
                        </div>
                        <span className={`text-xs font-bold ${isSpace ? 'text-green-400' : 'text-green-600'}`}>
                          +{task.points_value} {theme.starLabel.toLowerCase()} earned
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Reward Shop Tab ── */}
        {tab === 'shop' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-400 to-yellow-400 rounded-3xl p-5 text-white flex items-center justify-between animate-slideUp">
              <div>
                <p className="font-display font-bold text-lg">My {theme.starLabel}</p>
                <p className="text-3xl font-display font-extrabold">{child.points} {theme.starIcon}</p>
              </div>
              <div className="text-5xl animate-float">{theme.emoji}</div>
            </div>

            {claimedRewards.length > 0 && (
              <>
                <h2 className={`text-lg font-display font-bold ${textPrimary} px-1`}>
                  Waiting for Approval
                </h2>
                {claimedRewards.map((r) => (
                  <div key={r.id} className={`${theme.cardBg} ${cardBorder} border-2 rounded-3xl p-4 flex items-center gap-4 ${
                    isSpace ? 'border-indigo-700' : 'border-indigo-200'
                  }`}>
                    <div className="text-3xl">{r.icon_name}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className={`font-display font-bold ${textPrimary}`}>{r.title}</h3>
                        <SpeakButton text={r.title} lang={speechLang} iconSize={16} />
                      </div>
                      <p className={`text-xs font-semibold ${isSpace ? 'text-indigo-400' : 'text-indigo-500'}`}>
                        Waiting for parent to approve
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}

            <h2 className={`text-lg font-display font-bold ${textPrimary} px-1`}>
              Spend Your {theme.starLabel}
            </h2>
            {availableRewards.length === 0 && (
              <div className={`${theme.cardBg} ${cardBorder} rounded-3xl p-8 text-center`}>
                <div className="text-5xl mb-2">🎁</div>
                <p className={`font-display font-bold ${textPrimary}`}>No rewards yet. Ask a parent to add some!</p>
              </div>
            )}
            {availableRewards.map((reward) => {
              const canAfford = child.points >= reward.point_cost
              return (
                <div
                  key={reward.id}
                  className={`${theme.cardBg} ${cardBorder} rounded-3xl p-4 shadow-md transition-all animate-slideUp ${
                    canAfford ? 'hover:shadow-lg' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl ${
                      isSpace ? 'bg-slate-700/50' : 'bg-slate-50'
                    }`}>
                      {reward.icon_name}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className={`font-display font-bold ${textPrimary} text-lg truncate`}>
                          {reward.title}
                        </h3>
                        <SpeakButton text={reward.title} lang={speechLang} iconSize={16} />
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-base">{theme.starIcon}</span>
                        <span className={`font-display font-extrabold ${
                          isSpace ? 'text-cyan-400' : 'text-amber-600'
                        }`}>{reward.point_cost}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => claimReward(reward)}
                      disabled={!canAfford}
                      className={`flex items-center gap-1.5 font-display font-bold px-4 py-3 rounded-2xl transition-all flex-shrink-0 ${
                        canAfford
                          ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-md hover:scale-105 active:scale-95'
                          : isSpace
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? (
                        <><ShoppingBag className="w-5 h-5" />Claim</>
                      ) : (
                        <><Lock className="w-5 h-5" />Locked</>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Outfits Tab ── */}
        {tab === 'outfits' && (
          <div className="space-y-4">
            {/* Current outfit preview */}
            <div className={`${theme.cardBg} ${cardBorder} rounded-3xl p-5 shadow-md animate-slideUp`}>
              <div className="flex items-center gap-4">
                <Avatar
                  photoUrl={child.photo_url}
                  outfit={equippedOutfit}
                  size={80}
                  ringClass={`ring-4 ${theme.ring} shadow-lg`}
                />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${textMuted}`}>Current Outfit</p>
                  <h3 className={`font-display font-bold text-lg ${textPrimary}`}>
                    {equippedOutfit ? equippedOutfit.title : 'No outfit equipped'}
                  </h3>
                  {equippedOutfit && (
                    <button
                      onClick={unequipOutfit}
                      className={`text-xs font-bold mt-1 ${isSpace ? 'text-rose-400 hover:text-rose-300' : 'text-rose-500 hover:text-rose-400'}`}
                    >
                      Remove outfit
                    </button>
                  )}
                </div>
              </div>
            </div>

            <h2 className={`text-lg font-display font-bold ${textPrimary} px-1`}>
              My Outfits
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {outfits.map((outfit) => {
                const unlocked = isOutfitUnlocked(outfit.id)
                const equipped = child.active_outfit_id === outfit.id
                return (
                  <div
                    key={outfit.id}
                    className={`${theme.cardBg} ${cardBorder} rounded-3xl p-4 shadow-md text-center transition-all animate-slideUp ${
                      unlocked ? 'hover:shadow-lg' : 'opacity-70'
                    }`}
                  >
                    {/* Preview with outfit */}
                    <div className="flex justify-center mb-2">
                      <div className="relative">
                        <Avatar
                          photoUrl={child.photo_url}
                          outfit={unlocked ? outfit : null}
                          size={80}
                          ringClass={`ring-2 ${equipped ? theme.ring : 'ring-transparent'}`}
                        />
                        {!unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-full">
                            <Lock className="w-7 h-7 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className={`font-display font-bold text-sm ${textPrimary} truncate`}>
                      {outfit.title}
                    </h3>
                    {!unlocked ? (
                      <>
                        <p className={`text-xs font-bold ${isSpace ? 'text-cyan-400' : 'text-amber-600'} mb-2`}>
                          {theme.starIcon} {outfit.point_cost}
                        </p>
                        <button
                          onClick={() => unlockOutfit(outfit)}
                          disabled={child.points < outfit.point_cost}
                          className={`w-full text-xs font-display font-bold py-2 rounded-xl transition-all ${
                            child.points >= outfit.point_cost
                              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:scale-105 active:scale-95'
                              : isSpace
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          Unlock
                        </button>
                      </>
                    ) : equipped ? (
                      <span className={`inline-block text-xs font-bold py-2 px-3 rounded-xl ${
                        isSpace ? 'bg-cyan-900/50 text-cyan-300' : 'bg-green-100 text-green-600'
                      }`}>
                        ✓ Equipped
                      </span>
                    ) : (
                      <button
                        onClick={() => equipOutfit(outfit)}
                        className={`w-full text-xs font-display font-bold py-2 rounded-xl transition-all ${
                          isSpace
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                            : 'bg-indigo-500 text-white hover:bg-indigo-400'
                        }`}
                      >
                        Wear
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Language selector + Exit button */}
      <div className="fixed bottom-4 left-4 flex items-center gap-2 z-20">
        <button
          onClick={onExit}
          className={`flex items-center gap-1.5 font-bold px-4 py-2.5 rounded-2xl shadow-md transition-all ${
            isSpace
              ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              : 'bg-white/80 text-slate-600 hover:bg-white'
          } backdrop-blur-sm`}
        >
          <LogOut className="w-4 h-4" />
          Exit
        </button>
        {isSpeechSupported() && (
          <div className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl shadow-md backdrop-blur-sm ${
            isSpace ? 'bg-slate-800/80' : 'bg-white/80'
          }`}>
            <Volume2 className={`w-4 h-4 ${isSpace ? 'text-cyan-400' : 'text-indigo-500'}`} />
            <select
              value={speechLang}
              onChange={(e) => {
                setLang(e.target.value)
                setSpeechLang(e.target.value)
              }}
              className={`bg-transparent text-sm font-bold focus:outline-none cursor-pointer ${
                isSpace ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className={isSpace ? 'bg-slate-800' : 'bg-white'}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 font-display font-bold px-6 py-3 rounded-2xl shadow-xl z-50 animate-pop ${
          isSpace ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'
        }`}>
          {toast}
        </div>
      )}

      {/* Focus Timer Modal */}
      {activeTask && (
        <FocusTimer
          durationMins={activeTask.duration_mins}
          onDone={() => completeTask(activeTask)}
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
