import { useState, useEffect, useCallback } from 'react'
import { supabase, generatePairCode, ALL_SUBJECTS, type Profile, type Task, type Reward, type ApprovalRequest, type TaskApprovalMode, type ProgressDisplayMode } from '../lib/supabase'
import { useI18n, LANGUAGES, type LangCode } from '../lib/i18n'
import {
  Shield, LogOut, Plus, Check, X, Clock, TrendingUp, BookOpen, Award,
  UserCog, Rocket, Sparkles, Lock, KeyRound, Copy, Bell, Globe,
  CalendarClock, Trash2, Palette, Gift, Smile, Ruler, ChevronDown,
} from 'lucide-react'
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
  const [showAddChild, setShowAddChild] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedChild, setExpandedChild] = useState<string | null>(null)

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
      const [{ data: taskData }, { data: rewardData }, { data: approvalData }] = await Promise.all([
        supabase.from('tasks').select('*').in('child_id', childIds).order('created_at', { ascending: false }),
        supabase.from('rewards').select('*').in('child_id', childIds).order('created_at', { ascending: false }),
        supabase.from('approval_requests').select('*').eq('parent_id', currentParent.id).eq('status', 'pending').order('created_at', { ascending: false }),
      ])
      if (taskData) setTasks(taskData as Task[])
      if (rewardData) setRewards(rewardData as Reward[])
      if (approvalData) setApprovalRequests(approvalData as ApprovalRequest[])
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

  const tabs: { id: Tab; label: string; icon: typeof BookOpen; badge?: number }[] = [
    { id: 'overview', label: t('overview'), icon: TrendingUp },
    { id: 'tasks', label: t('tasks'), icon: BookOpen },
    { id: 'rewards', label: t('rewards'), icon: Award },
    { id: 'approvals', label: t('approvalRequests'), icon: Bell, badge: approvalRequests.length },
    { id: 'mood', label: t('moodTracker'), icon: Smile },
    { id: 'growth', label: t('growth'), icon: Ruler },
    { id: 'profiles', label: t('profiles'), icon: UserCog },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center overflow-hidden">
              {currentParent.photo_url ? <img src={currentParent.photo_url} alt={currentParent.name} className="w-full h-full object-cover" /> : <Shield className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="font-display font-bold text-slate-800 text-lg leading-none">{t('parentPortal')}</p>
              <p className="text-xs text-slate-400 font-semibold">{currentParent.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <nav className="sticky top-[57px] z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-1.5 px-4 py-3 font-display font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
                tab === tb.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tb.icon className="w-4 h-4" /> {tb.label}
              {tb.badge ? (
                <span className="bg-rose-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{tb.badge}</span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-br from-indigo-500 to-teal-500 rounded-3xl p-6 text-white shadow-lg">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <UserCog className="w-4 h-4 text-indigo-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase">{t('children')}</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-800">{children.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase">{t('pending')}</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-800">{pendingTasks.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-4 h-4 text-teal-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase">{t('completed')}</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-800">{completedTasks.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-fuchsia-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase">{t('pointsAwarded')}</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-800">{totalPointsAwarded}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-700">{t('children')}</h3>
                <button
                  onClick={() => setShowAddChild(true)}
                  className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-3 py-1.5 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 text-sm"
                >
                  <Plus className="w-4 h-4" /> {t('addChild')}
                </button>
              </div>
              {children.length === 0 ? (
                <p className="text-slate-400 text-sm font-semibold">{t('noChildrenLinked')}</p>
              ) : (
                <div className="space-y-3">
                  {children.map((c) => {
                    const childTasks = tasks.filter((tk) => tk.child_id === c.id)
                    const childTheme = getTheme(c.theme_preference)
                    const isOpen = expandedChild === c.id
                    return (
                      <div key={c.id} className="bg-slate-50 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          <button
                            onClick={() => setExpandedChild(isOpen ? null : c.id)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-lg overflow-hidden shrink-0">
                              {c.photo_url ? <img src={c.photo_url} alt={c.child_name || c.name} className="w-full h-full object-cover" /> : '🚀'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-bold text-slate-700 truncate">{c.child_name || c.name}</p>
                              <p className="text-xs text-slate-400 font-semibold">{c.points} {t('pointsLower')} · {c.theme_preference}</p>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <button onClick={() => setTab('profiles')} className="text-indigo-500 text-sm font-bold hover:underline shrink-0">
                            {t('manage')}
                          </button>
                        </div>
                        {isOpen && (
                          <div className="px-3 pb-3 space-y-6 animate-fadeIn">
                            <div className="border-t border-slate-200 pt-4">
                              <h3 className="font-display font-bold text-slate-700 mb-3">{t('subjectProgress')}</h3>
                              <SubjectProgress
                                tasks={childTasks}
                                theme={childTheme}
                                isSpace={c.theme_preference === 'space'}
                                childId={c.id}
                                onTasksChange={fetchAll}
                                readOnly
                              />
                            </div>
                            <div className="border-t border-slate-200 pt-4">
                              <h3 className="font-display font-bold text-slate-700 mb-3">{t('readingJourney')}</h3>
                              <ReadingJourney
                                childId={c.id}
                                theme={childTheme}
                                isSpace={c.theme_preference === 'space'}
                                readOnly
                              />
                            </div>
                            <div className="border-t border-slate-200 pt-4">
                              <h3 className="font-display font-bold text-slate-700 mb-3">{t('iWriteMyBook')}</h3>
                              <BookReflections
                                childId={c.id}
                                theme={childTheme}
                                isSpace={c.theme_preference === 'space'}
                                readOnly
                              />
                            </div>
                          </div>
                        )}
                      </div>
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
                onClick={() => setShowAddTask(true)}
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
                    <div key={reward.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col items-center text-center">
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

            {children.length === 0 ? (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
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
        <AddTaskModal children={children} rewards={rewards} lang={lang} t={t} onClose={() => setShowAddTask(false)} onAdd={async (childId, title, subject, duration, points, rewardId) => {
          await supabase.from('tasks').insert({ child_id: childId, title, subject, duration_mins: duration, point_value: points, status: 'pending', reward_id: rewardId || null })
          setShowAddTask(false); fetchAll()
        }} />
      )}
      {showAddReward && children.length > 0 && (
        <AddRewardModal children={children} lang={lang} t={t} onClose={() => setShowAddReward(false)} onAdd={async (childId, title, cost) => {
          await supabase.from('rewards').insert({ child_id: childId, title, point_cost: cost, status: 'available' })
          setShowAddReward(false); fetchAll()
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
    </div>
  )
}

type TFunc = (k: string) => string


function AddTaskModal({ children, rewards, lang, t, onClose, onAdd }: {
  children: Profile[]; rewards: Reward[]; lang: LangCode; t: TFunc; onClose: () => void
  onAdd: (childId: string, title: string, subject: string, duration: number, points: number, rewardId: string | null) => void
}) {
  const [childId, setChildId] = useState(children[0]?.id || '')
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

function AddRewardModal({ children, lang, t, onClose, onAdd }: {
  children: Profile[]; lang: LangCode; t: TFunc; onClose: () => void
  onAdd: (childId: string, title: string, cost: number) => void
}) {
  const [childId, setChildId] = useState(children[0]?.id || '')
  const [title, setTitle] = useState('')
  const [cost, setCost] = useState(20)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl text-slate-800">{t('addReward')}</h2>
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
            {t('createReward')}
          </button>
        </div>
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
