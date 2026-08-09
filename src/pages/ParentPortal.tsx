import { useState, useEffect, useCallback } from 'react'
import { supabase, generatePairCode, type Profile, type Task, type Reward } from '../lib/supabase'
import {
  Shield, LogOut, Plus, Check, X, Clock, TrendingUp, BookOpen, Award,
  UserCog, Rocket, Sparkles, Lock, KeyRound, Copy,
} from 'lucide-react'

type Props = {
  parent: Profile
  onSwitchProfile: () => void
}

type Tab = 'overview' | 'tasks' | 'rewards' | 'profiles'

export default function ParentPortal({ parent, onSwitchProfile }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [children, setChildren] = useState<Profile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [currentParent, setCurrentParent] = useState(parent)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddReward, setShowAddReward] = useState(false)
  const [showAddChild, setShowAddChild] = useState(false)
  const [copied, setCopied] = useState(false)

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
      const [{ data: taskData }, { data: rewardData }] = await Promise.all([
        supabase.from('tasks').select('*').in('child_id', childIds).order('created_at', { ascending: false }),
        supabase.from('rewards').select('*').in('child_id', childIds).order('created_at', { ascending: false }),
      ])
      if (taskData) setTasks(taskData as Task[])
      if (rewardData) setRewards(rewardData as Reward[])
    }
  }, [currentParent.id])

  useEffect(() => { fetchAll() }, [fetchAll])

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

  const pendingTasks = tasks.filter((t) => t.status === 'pending')
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const totalPointsAwarded = completedTasks.reduce((sum, t) => sum + t.point_value, 0)

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'tasks', label: 'Tasks', icon: BookOpen },
    { id: 'rewards', label: 'Rewards', icon: Award },
    { id: 'profiles', label: 'Profiles', icon: UserCog },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-slate-800 text-lg leading-none">Parent Portal</p>
              <p className="text-xs text-slate-400 font-semibold">{currentParent.name}</p>
            </div>
          </div>
          <button onClick={onSwitchProfile} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="sticky top-[57px] z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 font-display font-bold text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Family Pair Code Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-teal-500 rounded-3xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-display font-extrabold text-lg">Family Pair Code</h3>
              </div>
              <p className="text-indigo-100 text-sm font-semibold mb-3">Share this code with your child to link their device.</p>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3 flex-1">
                  <p className="font-display font-extrabold text-3xl tracking-wider">{currentParent.family_pair_code || 'No code set'}</p>
                </div>
                <button onClick={copyPairCode} className="bg-white/20 hover:bg-white/30 rounded-2xl p-3 transition-colors">
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
                <button onClick={regeneratePairCode} className="bg-white/20 hover:bg-white/30 rounded-2xl p-3 transition-colors">
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <UserCog className="w-4 h-4 text-indigo-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase">Children</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-800">{children.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase">Pending</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-800">{pendingTasks.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-4 h-4 text-teal-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase">Completed</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-800">{completedTasks.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-fuchsia-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase">Points Awarded</p>
                </div>
                <p className="font-display font-extrabold text-2xl text-slate-800">{totalPointsAwarded}</p>
              </div>
            </div>

            {/* Children Quick View */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4">Children</h3>
              {children.length === 0 ? (
                <p className="text-slate-400 text-sm font-semibold">No children linked yet. Share your Family Pair Code to get started!</p>
              ) : (
                <div className="space-y-3">
                  {children.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-lg">
                        {c.avatar || '🚀'}
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-slate-700">{c.child_name || c.name}</p>
                        <p className="text-xs text-slate-400 font-semibold">{c.points} points · {c.theme_preference} theme</p>
                      </div>
                      <button
                        onClick={() => setTab('profiles')}
                        className="text-indigo-500 text-sm font-bold hover:underline"
                      >
                        Manage
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-extrabold text-xl text-slate-800">Tasks</h2>
              <button
                onClick={() => setShowAddTask(true)}
                className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
            {children.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">Add a child first, then create tasks for them.</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">No tasks yet. Create one to get started!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const child = children.find((c) => c.id === task.child_id)
                  return (
                    <div key={task.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                      <div className={`w-2 h-12 rounded-full ${task.status === 'completed' ? 'bg-teal-400' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-slate-700 truncate">{task.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-400">{child?.child_name || child?.name}</span>
                          <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{task.subject}</span>
                          <span className="text-xs font-bold text-slate-400">{task.duration_mins}m · {task.point_value} pts</span>
                        </div>
                      </div>
                      {task.status === 'completed' && (
                        <Check className="w-5 h-5 text-teal-400" />
                      )}
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
            <div className="flex items-center justify-between">
              <h2 className="font-display font-extrabold text-xl text-slate-800">Rewards</h2>
              <button
                onClick={() => setShowAddReward(true)}
                className="bg-gradient-to-r from-amber-400 to-orange-500 text-white font-display font-bold px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Reward
              </button>
            </div>
            {children.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">Add a child first, then create rewards for them.</p>
              </div>
            ) : rewards.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <p className="text-slate-400 font-semibold">No rewards yet. Create one to motivate your child!</p>
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
                      <h3 className="font-display font-bold text-slate-700 text-sm">{reward.title}</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-1">{child?.child_name || child?.name} · {reward.point_cost} pts</p>
                      <span className={`text-xs font-bold mt-2 px-2 py-0.5 rounded-full ${
                        reward.status === 'claimed' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {reward.status === 'claimed' ? 'Claimed' : 'Available'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Profiles Tab */}
        {tab === 'profiles' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Parent PIN config */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Parent PIN
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
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-display font-bold text-slate-700 w-32 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-sm text-slate-400 font-semibold">Change your 4-digit PIN</p>
              </div>
            </div>

            {/* Guardian Security Settings */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-500" />
                Guardian Security Settings
              </h3>
              {children.length === 0 ? (
                <p className="text-slate-400 text-sm font-semibold">No children linked yet.</p>
              ) : (
                <div className="space-y-4">
                  {children.map((c) => (
                    <div key={c.id} className="border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-sm">
                          {c.avatar || '🚀'}
                        </div>
                        <p className="font-display font-bold text-slate-700">{c.child_name || c.name}</p>
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="text-sm font-semibold text-slate-600">Require PIN for Task Completion</p>
                            <p className="text-xs text-slate-400">Tasks complete instantly when OFF</p>
                          </div>
                          <button
                            onClick={() => updateProfile(c.id, { require_pin_for_tasks: !c.require_pin_for_tasks })}
                            className={`relative w-12 h-7 rounded-full transition-colors ${c.require_pin_for_tasks ? 'bg-indigo-500' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${c.require_pin_for_tasks ? 'translate-x-5' : ''}`} />
                          </button>
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="text-sm font-semibold text-slate-600">Require PIN to Redeem Rewards</p>
                            <p className="text-xs text-slate-400">Guardian must approve spending points</p>
                          </div>
                          <button
                            onClick={() => updateProfile(c.id, { require_pin_for_rewards: !c.require_pin_for_rewards })}
                            className={`relative w-12 h-7 rounded-full transition-colors ${c.require_pin_for_rewards ? 'bg-indigo-500' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${c.require_pin_for_rewards ? 'translate-x-5' : ''}`} />
                          </button>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Child Button */}
            <button
              onClick={() => setShowAddChild(true)}
              className="w-full bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 text-slate-400 font-display font-bold hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add Child Profile
            </button>
          </div>
        )}
      </main>

      {/* Add Task Modal */}
      {showAddTask && children.length > 0 && (
        <AddTaskModal
          children={children}
          onClose={() => setShowAddTask(false)}
          onAdd={async (childId, title, subject, duration, points) => {
            await supabase.from('tasks').insert({
              child_id: childId, title, subject, duration_mins: duration, point_value: points, status: 'pending',
            })
            setShowAddTask(false)
            fetchAll()
          }}
        />
      )}

      {/* Add Reward Modal */}
      {showAddReward && children.length > 0 && (
        <AddRewardModal
          children={children}
          onClose={() => setShowAddReward(false)}
          onAdd={async (childId, title, cost) => {
            await supabase.from('rewards').insert({
              child_id: childId, title, point_cost: cost, status: 'available',
            })
            setShowAddReward(false)
            fetchAll()
          }}
        />
      )}

      {/* Add Child Modal */}
      {showAddChild && (
        <AddChildModal
          parentId={currentParent.id}
          onClose={() => setShowAddChild(false)}
          onAdd={async (name, theme) => {
            await supabase.from('profiles').insert({
              role: 'child', name, child_name: name, theme_preference: theme,
              linked_parent_id: currentParent.id,
              require_pin_for_tasks: true, require_pin_for_rewards: true,
            })
            setShowAddChild(false)
            fetchAll()
          }}
        />
      )}
    </div>
  )
}

// --- Add Task Modal ---
function AddTaskModal({ children, onClose, onAdd }: {
  children: Profile[]
  onClose: () => void
  onAdd: (childId: string, title: string, subject: string, duration: number, points: number) => void
}) {
  const [childId, setChildId] = useState(children[0]?.id || '')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Math')
  const [duration, setDuration] = useState(15)
  const [points, setPoints] = useState(10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl text-slate-800">Add Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">Child</label>
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {children.map((c) => <option key={c.id} value={c.id}>{c.child_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">Task Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Read 10 pages" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 font-semibold text-slate-700 text-sm focus:outline-none">
                <option>Math</option><option>Reading</option><option>Science</option><option>Writing</option><option>Art</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">Minutes</label>
              <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">Points</label>
              <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <button
            onClick={() => onAdd(childId, title, subject, duration, points)}
            disabled={!title.trim()}
            className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Add Reward Modal ---
function AddRewardModal({ children, onClose, onAdd }: {
  children: Profile[]
  onClose: () => void
  onAdd: (childId: string, title: string, cost: number) => void
}) {
  const [childId, setChildId] = useState(children[0]?.id || '')
  const [title, setTitle] = useState('')
  const [cost, setCost] = useState(20)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl text-slate-800">Add Reward</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">Child</label>
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {children.map((c) => <option key={c.id} value={c.id}>{c.child_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">Reward Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 30 min screen time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">Point Cost</label>
            <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <button
            onClick={() => onAdd(childId, title, cost)}
            disabled={!title.trim()}
            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            Create Reward
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Add Child Modal ---
function AddChildModal({ parentId, onClose, onAdd }: {
  parentId: string
  onClose: () => void
  onAdd: (name: string, theme: 'space' | 'unicorn') => void
}) {
  const [name, setName] = useState('')
  const [theme, setTheme] = useState<'space' | 'unicorn'>('space')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-xl text-slate-800">Add Child</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">Child Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Leo" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase">Theme</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => setTheme('space')}
                className={`rounded-2xl p-4 border-2 transition-all ${theme === 'space' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
              >
                <Rocket className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                <p className="font-display font-bold text-slate-700 text-sm">Space</p>
              </button>
              <button
                onClick={() => setTheme('unicorn')}
                className={`rounded-2xl p-4 border-2 transition-all ${theme === 'unicorn' ? 'border-fuchsia-500 bg-fuchsia-50' : 'border-slate-200'}`}
              >
                <Sparkles className="w-6 h-6 text-fuchsia-500 mx-auto mb-1" />
                <p className="font-display font-bold text-slate-700 text-sm">Unicorn</p>
              </button>
            </div>
          </div>
          <button
            onClick={() => onAdd(name, theme)}
            disabled={!name.trim()}
            className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            Add Child
          </button>
        </div>
      </div>
    </div>
  )
}
