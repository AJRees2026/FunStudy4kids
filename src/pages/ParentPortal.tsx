import { useState, useEffect, useCallback } from 'react'
import { supabase, generatePairCode, ALL_SUBJECTS, type Profile, type Task, type Reward, type ApprovalRequest, type TaskApprovalMode, type ProgressDisplayMode } from '../lib/supabase'
import { useI18n, LANGUAGES, type LangCode } from '../lib/i18n'
import { Shield, LogOut, Plus, Check, X, Clock, TrendingUp, BookOpen, Award, UserCog, Rocket, Sparkles, Lock, KeyRound, Copy, Bell, Globe, CalendarClock, Trash2, Palette, Gift, Smile, Ruler, ChevronDown, ChevronRight, Pencil, ClipboardList, CircleAlert as AlertCircle, Trophy, UserCheck } from 'lucide-react'
import SubjectProgress from '../components/SubjectProgress'
import ReadingJourney from '../components/ReadingJourney'
import BookReflections from '../components/BookReflections'
import ParentMoodView from '../components/ParentMoodView'
import GrowthTracking from '../components/GrowthTracking'
import { getTheme } from '../lib/themes'

type Props = {
  parent: Profile
  onSwitchProfile: () => void
}

type Tab = 'overview' | 'tasks' | 'rewards' | 'profiles' | 'approvals' | 'mood' | 'growth'

export default function ParentPortal({ parent, onSwitchProfile }: Props) {
  const { lang, setLang, t } = useI18n()
  const [tab, setTab] = useState<Tab>('overview')
  const [children, setChildren] = useState<Profile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])
  const [currentParent, setCurrentParent] = useState(parent)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddReward, setShowAddReward] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [showAddChild, setShowAddChild] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedChild, setExpandedChild] = useState<string | null>(null)
  const [preselectedChildId, setPreselectedChildId] = useState<string | null>(null)
  const [awardPointsChild, setAwardPointsChild] = useState<Profile | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [moodEntries, setMoodEntries] = useState<{ child_id: string; entry_date: string; mood: string }[]>([])
  const [isPairCodeDismissed, setIsPairCodeDismissed] = useState(() => {
    try { return localStorage.getItem('pairCodeDismissed') === 'true' } catch { return false }
  })
  const [showPairCodeModal, setShowPairCodeModal] = useState(false)

  const dismissPairCode = () => {
    setIsPairCodeDismissed(true)
    try { localStorage.setItem('pairCodeDismissed', 'true') } catch {}
  }
  const restorePairCode = () => {
    setIsPairCodeDismissed(false)
    try { localStorage.removeItem('pairCodeDismissed') } catch {}
  }

  const fetchAll = useCallback(async () => {
    const { data: kids } = await supabase
      .from('profiles')
      .select('*')
      .eq('linked_parent_id', currentParent.id)
      .eq('role', 'child')
      .order('created_at', { ascending: true })
    if (kids) setChildren(kids as Profile[])

    if (kids && kids.length > 0) {
      const childIds = (kids as Profile[]).map((c) => c.id)
      const [{ data: taskData }, { data: rewardData }, { data: approvalData }, { data: moodData }] = await Promise.all([
        supabase.from('tasks').select('*').in('child_id', childIds).order('created_at', { ascending: false }),
        supabase.from('rewards').select('*').in('child_id', childIds).order('created_at', { ascending: false }),
        supabase.from('approval_requests').select('*').eq('parent_id', currentParent.id).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('mood_entries').select('child_id, entry_date, mood').in('child_id', childIds).order('entry_date', { ascending: false }),
      ])
      if (taskData) setTasks(taskData as Task[])
      if (rewardData) setRewards(rewardData as Reward[])
      if (approvalData) setApprovalRequests(approvalData as ApprovalRequest[])
      if (moodData) setMoodEntries(moodData as { child_id: string; entry_date: string; mood: string }[])
    }
  }, [currentParent.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    await supabase.from('profiles').update(updates).eq('id', id)
    if (id === currentParent.id) setCurrentParent({ ...currentParent, ...updates })
    setChildren((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c))
  }

  const copyPairCode = () => {
    navigator.clipboard?.writeText(currentParent.family_pair_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regeneratePairCode = async () => {
    const newCode = generatePairCode()
    await updateProfile(currentParent.id, { family_pair_code: newCode })
  }

  const handleAwardPoints = async (childId: string, points: number) => {
    const child = children.find((c) => c.id === childId)
    if (!child) return
    await supabase.from('profiles').update({
      points: child.points + points,
    }).eq('id', childId)
    fetchAll()
    setAwardPointsChild(null)
  }

  const handleApprove = async (req: ApprovalRequest) => {
    await supabase.from('approval_requests').update({
      status: 'approved', resolved_at: new Date().toISOString(),
    }).eq('id', req.id)

    if (req.task_id) {
      await supabase.from('tasks').update({
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('id', req.task_id)
    }

    const child = children.find((c) => c.id === req.child_id)
    if (child) {
      await supabase.from('profiles').update({
        points: child.points + req.point_value,
      }).eq('id', child.id)
    }

    setApprovalRequests((prev) => prev.filter((r) => r.id !== req.id))
    fetchAll()
  }

  const handleDeny = async (req: ApprovalRequest) => {
    await supabase.from('approval_requests').update({
      status: 'denied', resolved_at: new Date().toISOString(),
    }).eq('id', req.id)
    setApprovalRequests((prev) => prev.filter((r) => r.id !== req.id))
  }

  const pendingTasks = tasks.filter((tk) => tk.status === 'pending')
  const completedTasks = tasks.filter((tk) => tk.status === 'completed')
  const totalPointsAwarded = completedTasks.reduce((sum, tk) => sum + tk.point_value, 0)

  const availableRewards = rewards.filter((r) => r.status === 'available')
  const claimedRewards = rewards.filter((r) => r.status === 'claimed')

  const todayStr = new Date().toISOString().slice(0, 10)

  const getTodayMood = (childId: string): string | null => {
    const entry = moodEntries.find((m) => m.child_id === childId && m.entry_date === todayStr)
    return entry?.mood || null
  }

  const getDayStreak = (childId: string): number => {
    const childCompleted = tasks
      .filter((tk) => tk.child_id === childId && tk.status === 'completed' && tk.completed_at)
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    if (childCompleted.length === 0) return 0
    let streak = 0
    let checkDate = new Date()
    for (let i = 0; i < childCompleted.length; i++) {
      const taskDate = new Date(childCompleted[i].completed_at!).toISOString().slice(0, 10)
      const checkStr = checkDate.toISOString().slice(0, 10)
      if (taskDate === checkStr) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (taskDate < checkStr) {
        break
      }
    }
    return streak
  }

  const getLastCompletedTime = (childId: string): string | null => {
    const last = tasks
      .filter((tk) => tk.child_id === childId && tk.status === 'completed' && tk.completed_at)
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))[0]
    return last?.completed_at || null
  }

  const moodEmojiMap: Record<string, string> = {
    fantastic: '\u{1F929}', good: '\u{1F60A}', okay: '\u{1F610}', sad: '\u{1F622}', frustrated: '\u{1F620}',
  }

  const navBadges: { icon: typeof BookOpen; label: string; value: string | number; tab: Tab; border: string; shadow: string; iconBg: string; blink?: boolean }[] = [
    { icon: TrendingUp, label: t('overview'), value: '', tab: 'overview', border: 'border-indigo-500', shadow: 'shadow-[0_0_20px_rgba(99,102,241,0.3)]', iconBg: 'bg-indigo-100 text-indigo-600' },
    { icon: ClipboardList, label: t('sparkJobs'), value: `${completedTasks.length}/${tasks.length}`, tab: 'tasks', border: 'border-emerald-500', shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]', iconBg: 'bg-emerald-100 text-emerald-600' },
    { icon: Award, label: t('rewardShop'), value: `${totalPointsAwarded} / ${availableRewards.length}`, tab: 'rewards', border: 'border-amber-500', shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]', iconBg: 'bg-amber-100 text-amber-600', blink: availableRewards.length > 0 },
    { icon: AlertCircle, label: t('approvalRequests'), value: approvalRequests.length, tab: 'approvals', border: 'border-rose-500', shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]', iconBg: 'bg-rose-100 text-rose-600', blink: approvalRequests.length > 0 },
    { icon: Trophy, label: t('weeklyGoal'), value: '0/20', tab: 'overview', border: 'border-blue-500', shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]', iconBg: 'bg-blue-100 text-blue-600' },
    { icon: Smile, label: t('moodTracker'), value: children.length, tab: 'mood', border: 'border-violet-500', shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]', iconBg: 'bg-violet-100 text-violet-600' },
    { icon: Ruler, label: t('growth'), value: children.length, tab: 'growth', border: 'border-teal-500', shadow: 'shadow-[0_0_20px_rgba(20,184,166,0.3)]', iconBg: 'bg-teal-100 text-teal-600' },
    { icon: UserCheck, label: t('profiles'), value: children.length, tab: 'profiles', border: 'border-orange-500', shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]', iconBg: 'bg-orange-100 text-orange-600' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      <header className="sticky top-2 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-13 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center overflow-hidden">
              {currentParent.photo_url ? <img src={currentParent.photo_url} alt={currentParent.name} className="w-full h-full object-cover" /> : <Shield className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="font-display font-bold text-slate-800 text-lg leading-none">{t('parentPortal')}</p>
              <p className="text-lg text-slate-400 font-semibold">{currentParent.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPairCodeModal(true)}
              className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 font-bold px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors text-sm"
              title={t('showPairCode')}
            >
              <KeyRound className="w-4 h-4" /> {t('showPairCode')}
            </button>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="rounded-xl px-2 py-1.5 text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200 focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
            <button onClick={onSwitchProfile} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
              <LogOut className="w-7 h-7" />
            </button>
          </div>
        </div>
      </header>

      {tab === 'overview' && !isPairCodeDismissed && (
        <div className="max-w-3xl mx-auto px-4 pt-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-indigo-500 to-teal-500 rounded-3xl p-6 text-white shadow-lg relative">
            <button
              onClick={dismissPairCode}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title={t('cancel')}
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-display font-extrabold text-lg">{t('familyPairCodeLabel')}</h3>
            </div>
            <p className="text-indigo-100 text-sm font-semibold mb-3">{t('shareCodeHelp')}</p>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3 flex-1">
                <p className="font-display font-extrabold text-4xl tracking-[0.2em]">{currentParent.family_pair_code || '------'}</p>
              </div>
              <button onClick={copyPairCode} className="bg-white/20 hover:bg-white/30 rounded-2xl p-3 transition-colors">
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
              <button onClick={regeneratePairCode} className="bg-white/20 hover:bg-white/30 rounded-2xl p-3 transition-colors">
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Dashboard Hub — circular badges as tab navigation */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center py-2">
          {navBadges.map((badge, i) => {
            const isActive = tab === badge.tab
            return (
              <button
                key={i}
                onClick={() => setTab(badge.tab)}
                className={`flex flex-col items-center group transition-transform active:scale-95 ${isActive ? 'scale-105' : 'hover:scale-105'}`}
              >
                <div className={`w-30 h-30 md:w-28 md:h-28 rounded-full bg-white border-4 ${badge.border} ${badge.shadow} flex flex-col items-center justify-center p-1.5 text-center transition-all ${isActive ? 'ring-4 ring-offset-2 ring-indigo-300 bg-indigo-50/50' : ''} ${badge.blink ? 'animate-blink' : ''}`}>
                  <div className={`w-7 h-7 rounded-full ${badge.iconBg} flex items-center justify-center mb-0.5`}>
                    <badge.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 leading-tight mb-0.5 font-display">{badge.label}</span>
                  {badge.value !== '' && <span className={`font-display font-extrabold text-lg ${isActive ? 'text-indigo-600' : 'text-slate-800'}`}>{badge.value}</span>}
                </div>
              </button>
            )
          })}
        </div>

       {/* Overview Tab */}
{tab === 'overview' && (
  <div className="space-y-8 animate-fadeIn font-display">

    {/* Children List */}
    <div className="space-y-3">
      <h3 className="font-display font-extrabold text-lg text-slate-800">{t('children')}</h3>
      {children.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
          <p className="text-slate-400 font-semibold">{t('noChildrenLinkedShort')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((c) => {
            const childTasks = tasks.filter((tk) => tk.child_id === c.id)
            const childPoints = childTasks.filter((tk) => tk.status === 'completed').reduce((sum, tk) => sum + tk.point_value, 0)
            return (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className="group w-full bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3 hover:shadow-md hover:border-indigo-200 transition-all active:scale-[0.98] text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-lg overflow-hidden shrink-0">
                  {c.photo_url ? <img src={c.photo_url} alt={c.child_name || c.name} className="w-full h-full object-cover" /> : '🚀'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-slate-700 truncate">{c.child_name || c.name}</h4>
                  <p className="text-xs font-bold text-slate-400">{childTasks.filter((tk) => tk.status === 'pending').length} {t('pendingTasks')} · {childPoints} {t('pointsLower')}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full shrink-0">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="font-display font-extrabold text-sm text-amber-600">{childPoints}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  </div>
        )}
        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-extrabold text-xl text-slate-800">{t('tasks')}</h2>
              <button
                onClick={() => { setPreselectedChildId(null); setShowAddTask(true) }}
                disabled={children.length === 0}
                className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> {t('addTask')}
              </button>
            </div>
            {children.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">{t('addChildFirst')}</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">{t('noTasks')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const child = children.find((c) => c.id === task.child_id)
                  return (
                    <div key={task.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                      <div className={`w-2 h-12 rounded-full ${task.status === 'completed' ? 'bg-teal-400' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display font-bold text-slate-700 truncate">{task.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-400">{child?.child_name || child?.name}</span>
                          <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{task.subject}</span>
                          <span className="text-xs font-bold text-slate-400">{task.duration_mins}m · {task.point_value} pts</span>
                          {task.reward_id && (() => {
                            const linkedReward = rewards.find((r) => r.id === task.reward_id)
                            return linkedReward ? (
                              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Gift className="w-3 h-3" /> {linkedReward.title}
                              </span>
                            ) : null
                          })()}
                        </div>
                      </div>
                      {task.status === 'completed' && <Check className="w-5 h-5 text-teal-400" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Rewards Tab */}
        {tab === 'rewards' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5" />
                <h3 className="font-display font-extrabold text-lg">{t('rewardManagement')}</h3>
              </div>
              <p className="text-amber-50 text-sm font-semibold">{t('catalogDesc')}</p>
            </div>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-extrabold text-xl text-slate-800">{t('customCatalog')}</h2>
              <button
                onClick={() => setShowAddReward(true)}
                disabled={children.length === 0}
                className="bg-gradient-to-r from-amber-400 to-orange-500 text-white font-display font-bold px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> {t('addReward')}
              </button>
            </div>
            {children.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">{t('addChildFirst')}</p>
              </div>
            ) : rewards.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">{t('noRewards')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {rewards.map((reward) => {
                  const child = children.find((c) => c.id === reward.child_id)
                  return (
                    <div key={reward.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col items-center text-center relative">
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => setEditingReward(reward)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-500 flex items-center justify-center transition-colors"
                          title={t('editBook')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            await supabase.from('rewards').delete().eq('id', reward.id)
                            fetchAll()
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors"
                          title={t('deleteBook')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-display font-bold text-slate-700 text-sm">{reward.title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold mt-1">{child?.child_name || child?.name} · {reward.point_cost} pts</p>
                      <span className={`text-xs font-bold mt-2 px-2 py-0.5 rounded-full ${
                        reward.status === 'claimed' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {reward.status === 'claimed' ? t('claimed') : t('available')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Approvals Tab */}
        {tab === 'approvals' && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              {t('approvalRequests')}
              {approvalRequests.length > 0 && (
                <span className="bg-rose-500 text-white text-sm font-bold rounded-full px-2 py-0.5">{approvalRequests.length}</span>
              )}
            </h2>
            {approvalRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 font-semibold">{t('noApprovalRequests')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvalRequests.map((req) => {
                  const child = children.find((c) => c.id === req.child_id)
                  return (
                    <div key={req.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-sm overflow-hidden">
                          {child?.photo_url ? <img src={child.photo_url} alt={child?.child_name || child?.name} className="w-full h-full object-cover" /> : '🚀'}
                        </div>
                        <p className="font-display font-bold text-slate-700 text-sm">{child?.child_name || child?.name}</p>
                        <span className="text-xs text-slate-400 font-semibold ml-auto">
                          {new Date(req.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <p className="font-display font-bold text-slate-800">{req.task_title}</p>
                      </div>
                      <p className="text-xs font-bold text-indigo-500 mb-3">+{req.point_value} {t('pointsLower')}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req)}
                          className="flex-1 bg-gradient-to-r from-teal-500 to-green-500 text-white font-display font-bold py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> {t('approveBtn')}
                        </button>
                        <button
                          onClick={() => handleDeny(req)}
                          className="flex-1 bg-slate-100 text-slate-600 font-display font-bold py-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" /> {t('denyBtn')}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Mood Tab */}
        {tab === 'mood' && (
          <div className="space-y-6 animate-fadeIn">
            {children.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">{t('noChildrenLinkedShort')}</p>
              </div>
            ) : (
              children.map((c) => {
                const childTheme = getTheme(c.theme_preference)
                return (
                  <ParentMoodView
                    key={`mood_${c.id}`}
                    childId={c.id}
                    childName={c.child_name || c.name}
                    theme={childTheme}
                    isSpace={c.theme_preference === 'space'}
                  />
                )
              })
            )}
          </div>
        )}

        {/* Growth Tab */}
        {tab === 'growth' && (
          <div className="space-y-6 animate-fadeIn">
            {children.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">{t('noChildrenLinkedShort')}</p>
              </div>
            ) : (
              <GrowthTracking children={children} />
            )}
          </div>
        )}

        {/* Profiles Tab */}
        {tab === 'profiles' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                {t('parentPin')}
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  defaultValue={currentParent.parent_pin || ''}
                  onBlur={(e) => {
                    if (e.target.value !== currentParent.parent_pin) {
                      updateProfile(currentParent.id, { parent_pin: e.target.value })
                    }
                  }}
                  maxLength={4}
                  lang={lang}
                  spellCheck={false}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-display font-bold text-slate-700 w-32 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-sm text-slate-400 font-semibold">{t('changePin')}</p>
              </div>
            </div>

            <button
              onClick={() => setShowAddChild(true)}
              className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> {t('addChildProfile')}
            </button>
            {children.length === 0 ? (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 text-center">
                <p className="text-slate-400 text-sm font-semibold">{t('noChildrenLinkedShort')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {children.map((c) => {
                  const activeSubs: string[] = c.active_subjects || [...ALL_SUBJECTS]
                  const toggleSubject = (subj: string) => {
                    const next = activeSubs.includes(subj)
                      ? activeSubs.filter((s) => s !== subj)
                      : [...activeSubs, subj]
                    if (next.length === 0) return
                    updateProfile(c.id, { active_subjects: next })
                  }
                  return (
                    <div key={c.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-lg overflow-hidden">
                          {c.photo_url ? <img src={c.photo_url} alt={c.child_name || c.name} className="w-full h-full object-cover" /> : '🚀'}
                        </div>
                        <input
                          type="text"
                          defaultValue={c.child_name || c.name}
                          onBlur={(e) => {
                            const trimmed = e.target.value.trim()
                            if (trimmed && trimmed !== (c.child_name || c.name)) {
                              updateProfile(c.id, { child_name: trimmed, name: trimmed })
                            }
                          }}
                          lang={lang}
                          spellCheck={false}
                          className="font-display font-extrabold text-lg text-slate-700 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none px-1 py-0.5 transition-colors flex-1"
                        />
                      </div>

                      {/* Task Approval Mode Selector */}
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-indigo-400" />
                          {t('taskApprovalMode')}
                        </p>
                        <div className="space-y-2">
                          {([
                            { mode: 'off', label: t('modeOff'), desc: t('modeOffDesc') },
                            { mode: 'in_person_pin', label: t('modePin'), desc: t('modePinDesc') },
                            { mode: 'remote_notification', label: t('modeRemote'), desc: t('modeRemoteDesc') },
                          ] as { mode: TaskApprovalMode; label: string; desc: string }[]).map((opt) => (
                            <button
                              key={opt.mode}
                              onClick={() => updateProfile(c.id, { task_approval_mode: opt.mode })}
                              className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                                c.task_approval_mode === opt.mode
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <p className="font-display font-bold text-sm text-slate-700">{opt.label}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reward PIN toggle */}
                      <label className="flex items-center justify-between cursor-pointer border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-600">{t('requirePinRewards')}</p>
                          <p className="text-xs text-slate-400">{t('requirePinRewardsDesc')}</p>
                        </div>
                        <button
                          onClick={() => updateProfile(c.id, { require_pin_for_rewards: !c.require_pin_for_rewards })}
                          className={`relative w-12 h-7 rounded-full transition-colors ${c.require_pin_for_rewards ? 'bg-indigo-500' : 'bg-slate-300'}`}
                        >
                          <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${c.require_pin_for_rewards ? 'translate-x-5' : ''}`} />
                        </button>
                      </label>

                      {/* Progress Display Mode */}
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-sm font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                          <Palette className="w-4 h-4 text-indigo-400" />
                          {t('progressDisplayMode')}
                        </p>
                        <div className="space-y-2">
                          {([
                            { mode: 'percentage', label: t('modePercentage'), desc: t('modePercentageDesc') },
                            { mode: 'task_count', label: t('modeTaskCount'), desc: t('modeTaskCountDesc') },
                            { mode: 'theme_gauge', label: t('modeThemeGauge'), desc: t('modeThemeGaugeDesc') },
                          ] as { mode: ProgressDisplayMode; label: string; desc: string }[]).map((opt) => (
                            <button
                              key={opt.mode}
                              onClick={() => updateProfile(c.id, { progress_display_mode: opt.mode })}
                              className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                                c.progress_display_mode === opt.mode
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <p className="font-display font-bold text-sm text-slate-700">{opt.label}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subject Management */}
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-sm font-semibold text-slate-600 mb-1">{t('subjectManagement')}</p>
                        <p className="text-xs text-slate-400 mb-2">{t('subjectManagementDesc')}</p>
                        <div className="flex flex-wrap gap-2">
                          {ALL_SUBJECTS.map((subj) => {
                            const on = activeSubs.includes(subj)
                            return (
                              <button
                                key={subj}
                                onClick={() => toggleSubject(subj)}
                                className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                                  on
                                    ? 'bg-indigo-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                {on && <Check className="w-3 h-3 inline mr-1" />}
                                {subj}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Daily Cutoff Time */}
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-sm font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                          <CalendarClock className="w-4 h-4 text-amber-400" />
                          {t('dailyCutoffTime')}
                        </p>
                        <p className="text-xs text-slate-400 mb-2">{t('dailyCutoffDesc')}</p>
                        <input
                          type="time"
                          value={c.daily_cutoff_time || '18:00'}
                          onChange={(e) => updateProfile(c.id, { daily_cutoff_time: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>

                      {/* Auto-archive toggle */}
                      <label className="flex items-center justify-between cursor-pointer border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                            <Trash2 className="w-4 h-4 text-teal-400" />
                            {t('autoArchiveDaily')}
                          </p>
                          <p className="text-xs text-slate-400">{t('autoArchiveDesc')}</p>
                        </div>
                        <button
                          onClick={() => updateProfile(c.id, { auto_archive_daily: !c.auto_archive_daily })}
                          className={`relative w-12 h-7 rounded-full transition-colors ${c.auto_archive_daily ? 'bg-teal-500' : 'bg-slate-300'}`}
                        >
                          <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${c.auto_archive_daily ? 'translate-x-5' : ''}`} />
                        </button>
                      </label>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Modals */}
      {showAddTask && children.length > 0 && (
        <AddTaskModal children={children} rewards={rewards} lang={lang} t={t} preselectedChildId={preselectedChildId} onClose={() => { setShowAddTask(false); setPreselectedChildId(null) }} onAdd={async (childId, title, subject, duration, points, rewardId) => {
          await supabase.from('tasks').insert({ child_id: childId, title, subject, duration_mins: duration, point_value: points, status: 'pending', reward_id: rewardId || null })
          setShowAddTask(false); setPreselectedChildId(null); fetchAll()
        }} />
      )}
      {awardPointsChild && (
        <AwardPointsModal child={awardPointsChild} t={t} onClose={() => setAwardPointsChild(null)} onAward={handleAwardPoints} />
      )}
      {selectedChildId && (() => {
        const child = children.find((c) => c.id === selectedChildId)
        if (!child) return null
        return (
          <ChildDetailDrawer
            child={child}
            tasks={tasks.filter((tk) => tk.child_id === child.id)}
            rewards={rewards.filter((r) => r.child_id === child.id)}
            t={t}
            todayMood={getTodayMood(child.id)}
            dayStreak={getDayStreak(child.id)}
            lastCompletedTime={getLastCompletedTime(child.id)}
            moodEmojiMap={moodEmojiMap}
            todayStr={todayStr}
            onClose={() => setSelectedChildId(null)}
            onAddTask={() => { setPreselectedChildId(child.id); setShowAddTask(true); setSelectedChildId(null) }}
            onAwardPoints={() => { setAwardPointsChild(child); setSelectedChildId(null) }}
            onEditSettings={() => { setTab('profiles'); setSelectedChildId(null) }}
            onViewMood={() => { setTab('mood'); setSelectedChildId(null) }}
            onViewGrowth={() => { setTab('growth'); setSelectedChildId(null) }}
          />
        )
      })()}
      {showAddReward && children.length > 0 && (
        <AddRewardModal children={children} lang={lang} t={t} onClose={() => setShowAddReward(false)} onAdd={async (childId, title, cost) => {
          const targetIds = childId === '__all__' ? children.map((c) => c.id) : [childId]
          await supabase.from('rewards').insert(targetIds.map((id) => ({ child_id: id, title, point_cost: cost, status: 'available' })))
          setShowAddReward(false); fetchAll()
        }} />
      )}
      {editingReward && (
        <AddRewardModal children={children} lang={lang} t={t} onClose={() => setEditingReward(null)} editing={editingReward} onAdd={async (_childId, title, cost) => {
          await supabase.from('rewards').update({ title, point_cost: cost }).eq('id', editingReward.id)
          setEditingReward(null); fetchAll()
        }} />
      )}
      {showAddChild && (
        <AddChildModal parentId={currentParent.id} lang={lang} t={t} onClose={() => setShowAddChild(false)} onAdd={async (name, theme, gender) => {
          const { error } = await supabase.from('profiles').insert({
            role: 'child', name, child_name: name, gender, theme_preference: theme,
            linked_parent_id: currentParent.id, require_pin_for_tasks: true, require_pin_for_rewards: true, task_approval_mode: 'off',
            language: lang,
          })
          if (error) return error.message
          setShowAddChild(false); fetchAll()
          return null
        }} />
      )}
      {showPairCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-extrabold text-xl text-slate-800">{t('familyPairCodeLabel')}</h2>
              <button onClick={() => setShowPairCodeModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-400 text-sm font-semibold mb-4">{t('shareCodeHelp')}</p>
            <div className="bg-gradient-to-br from-indigo-500 to-teal-500 rounded-2xl p-6 text-white text-center mb-4">
              <p className="font-display font-extrabold text-4xl tracking-[0.2em]">{currentParent.family_pair_code || '------'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={copyPairCode} className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-2xl py-3 font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors">
                {copied ? <Check className="w-5 h-5 text-teal-500" /> : <Copy className="w-5 h-5" />}
                {copied ? t('copied') : t('copy')}
              </button>
              <button onClick={regeneratePairCode} className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-2xl py-3 font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors">
                <Sparkles className="w-5 h-5" />
                {t('regenerate')}
              </button>
            </div>
            {isPairCodeDismissed && (
              <button onClick={() => { restorePairCode(); setShowPairCodeModal(false) }} className="w-full mt-3 text-indigo-500 font-bold text-sm hover:underline">
                {t('showOnDashboard')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type TFunc = (k: string) => string


function ChildDetailDrawer({ child, tasks, rewards, t, todayMood, dayStreak, lastCompletedTime, moodEmojiMap, todayStr, onClose, onAddTask, onAwardPoints, onEditSettings, onViewMood, onViewGrowth }: {
  child: Profile; tasks: Task[]; rewards: Reward[]; t: TFunc; todayMood: string | null; dayStreak: number; lastCompletedTime: string | null; moodEmojiMap: Record<string, string>; todayStr: string; onClose: () => void
  onAddTask: () => void; onAwardPoints: () => void; onEditSettings: () => void; onViewMood: () => void; onViewGrowth: () => void
}) {
  const childPoints = tasks.filter((tk) => tk.status === 'completed').reduce((sum, tk) => sum + tk.point_value, 0)
  const pendingCount = tasks.filter((tk) => tk.status === 'pending').length
  const completedCount = tasks.filter((tk) => tk.status === 'completed').length
  const availableRewards = rewards.filter((r) => r.status === 'available')
  const todayTasks = tasks.filter((tk) => tk.created_at && tk.created_at.slice(0, 10) === todayStr)
  const todayCompleted = todayTasks.filter((tk) => tk.status === 'completed').length
  const todayTotal = todayTasks.length
  const pct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl max-w-md w-full max-h-[85vh] overflow-y-auto animate-slideUp shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Handle bar */}
        <div className="sticky top-0 bg-white pt-2 pb-1 flex justify-center z-10">
          <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-2xl overflow-hidden shrink-0">
              {child.photo_url ? <img src={child.photo_url} alt={child.child_name || child.name} className="w-full h-full object-cover" /> : '\u{1F680}'}
            </div>
            <div className="flex-1">
              <h2 className="font-display font-extrabold text-xl text-slate-800">{child.child_name || child.name}</h2>
              <p className="text-sm font-bold text-slate-400">{pendingCount} {t('pendingTasks')} · {completedCount} {t('completedTasks')}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-amber-50 rounded-2xl p-3 text-center">
              <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="font-display font-extrabold text-lg text-amber-600">{childPoints}</p>
              <p className="text-[10px] font-bold text-amber-500">{t('pointsLower')}</p>
            </div>
            <div className="bg-orange-50 rounded-2xl p-3 text-center">
              <p className="text-lg mb-0.5">{'\u{1F525}'}</p>
              <p className="font-display font-extrabold text-lg text-orange-600">{dayStreak}</p>
              <p className="text-[10px] font-bold text-orange-500">{t('dayStreakBadge')}</p>
            </div>
            <div className="bg-violet-50 rounded-2xl p-3 text-center">
              <p className="text-lg mb-0.5">{todayMood ? moodEmojiMap[todayMood] : '\u{1F4AD}'}</p>
              <p className="font-display font-extrabold text-xs text-violet-600">{todayMood ? t('moodToday') : t('noMoodToday')}</p>
            </div>
          </div>

          {/* Today's progress */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">{t('tasksToday')}</span>
              <span className="text-xs font-bold text-slate-600">{todayCompleted}/{todayTotal}</span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onAddTask} className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-95">
              <Plus className="w-4 h-4" /> {t('addTask')}
            </button>
            <button onClick={onAwardPoints} className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-95">
              <Award className="w-4 h-4" /> {t('awardPoints')}
            </button>
          </div>

          {/* Recent tasks */}
          <div>
            <h3 className="font-display font-bold text-sm text-slate-600 mb-2">{t('tasks')}</h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400 font-semibold py-2">{t('noTasksForChild')}</p>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5">
                    <div className={`w-1.5 h-8 rounded-full ${task.status === 'completed' ? 'bg-teal-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-700 truncate">{task.title}</p>
                      <p className="text-xs font-bold text-slate-400">{task.subject} · {task.point_value} pts</p>
                    </div>
                    {task.status === 'completed' && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rewards */}
          <div>
            <h3 className="font-display font-bold text-sm text-slate-600 mb-2">{t('rewards')}</h3>
            {availableRewards.length === 0 ? (
              <p className="text-sm text-slate-400 font-semibold py-2">{t('noRewardsForChild')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableRewards.map((r) => (
                  <span key={r.id} className="flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-bold px-2.5 py-1.5 rounded-full">
                    <Gift className="w-3 h-3" /> {r.title} ({r.point_cost})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            <button onClick={onViewMood} className="flex flex-col items-center gap-1 bg-violet-50 hover:bg-violet-100 text-violet-600 font-bold text-xs py-2.5 rounded-xl transition-colors active:scale-95">
              <Smile className="w-4 h-4" /> {t('viewMood')}
            </button>
            <button onClick={onViewGrowth} className="flex flex-col items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-600 font-bold text-xs py-2.5 rounded-xl transition-colors active:scale-95">
              <Ruler className="w-4 h-4" /> {t('viewGrowth')}
            </button>
            <button onClick={onEditSettings} className="flex flex-col items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-colors active:scale-95">
              <UserCog className="w-4 h-4" /> {t('editSettings')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddTaskModal({ children, rewards, lang, t, preselectedChildId, onClose, onAdd }: {
  children: Profile[]; rewards: Reward[]; lang: LangCode; t: TFunc; preselectedChildId: string | null; onClose: () => void
  onAdd: (childId: string, title: string, subject: string, duration: number, points: number, rewardId: string | null) => void
}) {
  const [childId, setChildId] = useState(preselectedChildId || children[0]?.id || '')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(15)
  const [points, setPoints] = useState(10)
  const [rewardId, setRewardId] = useState<string>('')

  const selectedChild = children.find((c) => c.id === childId) || children[0]
  const availableSubjects: string[] = selectedChild?.active_subjects && selectedChild.active_subjects.length > 0
    ? selectedChild.active_subjects
    : [...ALL_SUBJECTS]
  const [subject, setSubject] = useState(availableSubjects[0] || 'Math')

  const childRewards = rewards.filter((r) => r.child_id === childId && r.status === 'available')

  const handleChildChange = (id: string) => {
    setChildId(id)
    const c = children.find((ch) => ch.id === id)
    const subs = c?.active_subjects && c.active_subjects.length > 0 ? c.active_subjects : [...ALL_SUBJECTS]
    setSubject(subs[0] || 'Math')
    setRewardId('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl text-slate-800">{t('addTask')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">{t('child')}</label>
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {children.map((c) => <option key={c.id} value={c.id}>{c.child_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">{t('taskTitle')}</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('taskTitle')} lang={lang} spellCheck={true} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">{t('subject')}</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 font-semibold text-slate-700 text-sm focus:outline-none">
                {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">{t('minutes')}</label>
              <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">{t('points')}</label>
              <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          {/* Attach Reward */}
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <Gift className="w-3 h-3" /> {t('attachReward')}
            </label>
            <p className="text-xs text-slate-400 mb-2">{t('attachRewardDesc')}</p>
            <select
              value={rewardId}
              onChange={(e) => setRewardId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">{t('noRewardLinked')}</option>
              {childRewards.map((r) => (
                <option key={r.id} value={r.id}>{r.title} ({r.point_cost} pts)</option>
              ))}
            </select>
          </div>
          <button onClick={() => onAdd(childId, title, subject, duration, points, rewardId || null)} disabled={!title.trim()} className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {t('createTask')}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddRewardModal({ children, lang, t, onClose, onAdd, editing }: {
  children: Profile[]; lang: LangCode; t: TFunc; onClose: () => void
  onAdd: (childId: string, title: string, cost: number) => void
  editing?: Reward | null
}) {
  const [childId, setChildId] = useState(editing ? editing.child_id : (children.length > 1 ? '__all__' : (children[0]?.id || '')))
  const [title, setTitle] = useState(editing?.title || '')
  const [cost, setCost] = useState(editing?.point_cost ?? 20)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl text-slate-800">{editing ? t('editBook') : t('addReward')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          {children.length > 1 && !editing && (
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">{t('child')}</label>
              <select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="__all__">{t('allChildren')}</option>
                {children.map((c) => <option key={c.id} value={c.id}>{c.child_name || c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">{t('rewardTitle')}</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('rewardTitle')} lang={lang} spellCheck={true} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">{t('pointCost')}</label>
            <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <button onClick={() => onAdd(childId, title, cost)} disabled={!title.trim()} className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {editing ? t('saveReward') : t('createReward')}
          </button>
        </div>
      </div>
    </div>
  )
}

function AwardPointsModal({ child, t, onClose, onAward }: {
  child: Profile; t: TFunc; onClose: () => void
  onAward: (childId: string, points: number) => void
}) {
  const [points, setPoints] = useState(10)
  const presets = [5, 10, 20, 50]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl text-slate-800">{t('awardPoints')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-slate-400 font-semibold mb-4">{t('awardPointsDesc')} <span className="text-slate-700 font-bold">{child.child_name || child.name}</span></p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {presets.map((p) => (
            <button key={p} onClick={() => setPoints(p)} className={`py-2 rounded-xl font-bold text-sm transition-all ${points === p ? 'bg-amber-500 text-white scale-105' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              +{p}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label className="text-xs text-slate-400 font-bold uppercase">{t('bonusPoints')}</label>
          <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} min={1} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <button onClick={() => onAward(child.id, points)} disabled={points <= 0} className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
          {t('award')}
        </button>
      </div>
    </div>
  )
}

function AddChildModal({ parentId, lang, t, onClose, onAdd }: {
  parentId: string; lang: LangCode; t: TFunc; onClose: () => void
  onAdd: (name: string, theme: 'space' | 'unicorn', gender: string) => Promise<string | null>
}) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'boy' | 'girl' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const theme: 'space' | 'unicorn' = gender === 'girl' ? 'unicorn' : 'space'

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const err = await onAdd(name, theme, gender)
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl text-slate-800">{t('addChild')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 font-bold uppercase">Your Little User's Name</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder='nickname also good!' lang={lang} spellCheck={true} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 font-bold uppercase">Gender</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button onClick={() => setGender('boy')} className={`rounded-2xl p-4 border-2 transition-all flex flex-col items-center gap-1 ${gender === 'boy' ? 'border-indigo-500 bg-indigo-50 scale-105' : 'border-slate-200 hover:border-indigo-300'}`}>
                <Rocket className="w-9 h-9 text-indigo-500" />
                <p className="font-display font-bold text-slate-700 text-lg">{t('boy')}</p>
                <p className="text-sm text-slate-400 font-semibold">{t('boyTheme')}</p>
              </button>
              <button onClick={() => setGender('girl')} className={`rounded-2xl p-4 border-2 transition-all flex flex-col items-center gap-1 ${gender === 'girl' ? 'border-fuchsia-500 bg-fuchsia-50 scale-105' : 'border-slate-200 hover:border-fuchsia-300'}`}>
                <Sparkles className="w-9 h-9 text-fuchsia-500" />
                <p className="font-display font-bold text-slate-700 text-lg">{t('girl')}</p>
                <p className="text-sm text-slate-400 font-semibold">{t('girlTheme')}</p>
              </button>
            </div>
          </div>
          {error && <p className="text-rose-500 text-sm font-semibold text-center">{error}</p>}
          <button onClick={handleSubmit} disabled={!name.trim() || !gender || loading} className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {loading ? '...' : t('addChild')}
          </button>
        </div>
      </div>
    </div>
  )
}
