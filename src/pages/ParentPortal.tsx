import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  supabase, uploadAvatarPhoto,
  type Profile, type Task, type Reward, type StudySession, type Outfit,
} from '../lib/supabase'
import Avatar from '../components/Avatar'
import {
  Shield, LogOut, Plus, Check, X, Clock, TrendingUp, BookOpen, Award,
  UserCog, Camera, Rocket, Sparkles, Lock,
} from 'lucide-react'

type Tab = 'overview' | 'tasks' | 'rewards' | 'profiles'

const SUBJECT_COLORS: Record<string, string> = {
  Reading: '#6366f1',
  Math: '#14b8a6',
  Science: '#fbbf24',
  Writing: '#fb7185',
  Spelling: '#a78bfa',
  Art: '#f97316',
  Music: '#06b6d4',
  Geography: '#84cc16',
}

const ICON_OPTIONS = ['📖', '✏️', '🔬', '✍️', '🔤', '🎨', '🎵', '🌍', '🧮', '📐']
const SUBJECT_OPTIONS = ['Reading', 'Math', 'Science', 'Writing', 'Spelling', 'Art', 'Music', 'Geography']
const GRADE_OPTIONS = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade']

export default function ParentPortal({ onExit }: { onExit: () => void }) {
  const [unlocked, setUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [parent, setParent] = useState<Profile | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [children, setChildren] = useState<Profile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [toast, setToast] = useState('')
  const [uploading, setUploading] = useState(false)

  // Task creator form
  const [formChildId, setFormChildId] = useState('')
  const [formSubject, setFormSubject] = useState('Reading')
  const [formTitle, setFormTitle] = useState('')
  const [formIcon, setFormIcon] = useState('📖')
  const [formDuration, setFormDuration] = useState(15)
  const [formPoints, setFormPoints] = useState(10)
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().slice(0, 10))

  // Reward creator form
  const [rFormChildId, setRFormChildId] = useState('')
  const [rFormTitle, setRFormTitle] = useState('')
  const [rFormIcon, setRFormIcon] = useState('🎁')
  const [rFormCost, setRFormCost] = useState(30)

  // Profile editor
  const [editingChild, setEditingChild] = useState<Profile | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadParent = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'parent')
      .maybeSingle()
    if (data) setParent(data as Profile)
  }, [])

  const loadData = useCallback(async () => {
    const [childRes, taskRes, rewardRes, sessionRes, outfitRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'child').order('name'),
      supabase.from('tasks').select('*').order('due_date'),
      supabase.from('rewards').select('*').order('created_at'),
      supabase.from('study_sessions').select('*').order('completed_at', { ascending: false }),
      supabase.from('outfits').select('*').order('point_cost'),
    ])
    if (childRes.data) {
      setChildren(childRes.data as Profile[])
      const firstChild = childRes.data[0] as Profile
      if (firstChild) {
        if (!formChildId) setFormChildId(firstChild.id)
        if (!rFormChildId) setRFormChildId(firstChild.id)
      }
    }
    if (taskRes.data) setTasks(taskRes.data as Task[])
    if (rewardRes.data) setRewards(rewardRes.data as Reward[])
    if (sessionRes.data) setSessions(sessionRes.data as StudySession[])
    if (outfitRes.data) setOutfits(outfitRes.data as Outfit[])
  }, [])

  useEffect(() => {
    loadParent()
  }, [loadParent])

  useEffect(() => {
    if (unlocked) loadData()
  }, [unlocked, loadData])

  const handlePinSubmit = async () => {
    if (!parent) return
    if (pinInput === parent.parent_pin) {
      setUnlocked(true)
      setPinError('')
    } else {
      setPinError('Wrong PIN. Try again!')
      setPinInput('')
    }
  }

  // ── Chart data ──────────────────────────────
  const filteredSessions = selectedChild === 'all'
    ? sessions
    : sessions.filter((s) => s.child_id === selectedChild)

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const weeklyData = last7Days.map((d) => {
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' })
    const dayKey = d.toISOString().slice(0, 10)
    const dayMins = filteredSessions
      .filter((s) => s.completed_at.slice(0, 10) === dayKey)
      .reduce((sum, s) => sum + s.duration_mins, 0)
    return { day: dayStr, minutes: dayMins }
  })

  const subjectData = Object.entries(
    filteredSessions.reduce((acc, s) => {
      acc[s.subject] = (acc[s.subject] || 0) + s.duration_mins
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const filteredTasks = selectedChild === 'all'
    ? tasks
    : tasks.filter((t) => t.child_id === selectedChild)

  const filteredRewards = selectedChild === 'all'
    ? rewards
    : rewards.filter((r) => r.child_id === selectedChild)

  const claimedRewards = filteredRewards.filter((r) => r.status === 'claimed')

  const totalMins = filteredSessions.reduce((sum, s) => sum + s.duration_mins, 0)
  const totalHours = (totalMins / 60).toFixed(1)
  const completionRate = filteredTasks.length > 0
    ? Math.round((filteredTasks.filter((t) => t.status === 'completed').length / filteredTasks.length) * 100)
    : 0

  const childName = (id: string) => children.find((c) => c.id === id)?.child_name || children.find((c) => c.id === id)?.name || 'Unknown'
  const childOutfit = (outfitId: string | null) => outfits.find((o) => o.id === outfitId) || null

  // ── Actions ──────────────────────────────
  const createTask = async () => {
    if (!formChildId || !formTitle.trim()) {
      showToast('Please fill in all fields')
      return
    }
    await supabase.from('tasks').insert({
      child_id: formChildId,
      subject: formSubject,
      title: formTitle.trim(),
      icon_name: formIcon,
      duration_mins: formDuration,
      points_value: formPoints,
      due_date: formDueDate,
    })
    setFormTitle('')
    showToast('Task created!')
    await loadData()
  }

  const createReward = async () => {
    if (!rFormChildId || !rFormTitle.trim()) {
      showToast('Please fill in all fields')
      return
    }
    await supabase.from('rewards').insert({
      child_id: rFormChildId,
      title: rFormTitle.trim(),
      point_cost: rFormCost,
      icon_name: rFormIcon,
      status: 'locked',
    })
    setRFormTitle('')
    showToast('Reward added!')
    await loadData()
  }

  const approveReward = async (reward: Reward) => {
    await supabase.from('rewards').update({ status: 'approved' }).eq('id', reward.id)
    showToast('Reward approved!')
    await loadData()
  }

  const declineReward = async (reward: Reward) => {
    const child = children.find((c) => c.id === reward.child_id)
    if (child) {
      await supabase
        .from('profiles')
        .update({ points: child.points + reward.point_cost })
        .eq('id', child.id)
    }
    await supabase.from('rewards').update({ status: 'declined' }).eq('id', reward.id)
    showToast('Reward declined. Stars refunded.')
    await loadData()
  }

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    showToast('Task deleted')
    await loadData()
  }

  const deleteReward = async (rewardId: string) => {
    await supabase.from('rewards').delete().eq('id', rewardId)
    showToast('Reward deleted')
    await loadData()
  }

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    await supabase.from('profiles').update(updates).eq('id', id)
    showToast('Profile updated!')
    await loadData()
  }

  const handlePhotoUpload = async (childId: string, file: File) => {
    setUploading(true)
    const url = await uploadAvatarPhoto(childId, file)
    if (url) {
      await updateProfile(childId, { photo_url: url })
    } else {
      showToast('Upload failed. Try again.')
    }
    setUploading(false)
  }

  // ── PIN Screen ──────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-500 rounded-3xl mb-4 shadow-xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white">Parent Portal</h1>
          <p className="text-slate-400 mt-1">Enter your PIN to continue</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-sm">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            placeholder="• • • •"
            className="w-full text-center text-4xl tracking-[0.5em] font-display font-bold bg-white/10 text-white placeholder-slate-500 rounded-2xl py-4 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            autoFocus
          />
          {pinError && (
            <p className="text-rose-400 text-center font-semibold mb-4 animate-pop">{pinError}</p>
          )}
          <button
            onClick={handlePinSubmit}
            className="w-full bg-indigo-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:bg-indigo-400 transition-all"
          >
            Unlock
          </button>
          <button
            onClick={onExit}
            className="w-full text-slate-400 font-semibold text-sm mt-4 hover:text-white transition-all"
          >
            ← Back to Home
          </button>
        </div>
        <p className="text-slate-500 text-sm mt-6">Demo PIN: 1234</p>
      </div>
    )
  }

  // ── Main Portal ─────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" />
            <h1 className="text-xl font-display font-extrabold text-slate-800">Parent Portal</h1>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-slate-500 font-semibold text-sm hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Exit
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {([
            { key: 'overview' as Tab, label: 'Overview' },
            { key: 'profiles' as Tab, label: 'Profiles' },
            { key: 'tasks' as Tab, label: 'Tasks' },
            { key: 'rewards' as Tab, label: 'Rewards' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 font-display font-bold text-sm whitespace-nowrap border-b-2 transition-all ${
                tab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {label === 'Rewards' && claimedRewards.length > 0 && (
                <span className="bg-rose-400 text-white text-xs px-1.5 py-0.5 rounded-full mr-1">
                  {claimedRewards.length}
                </span>
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Child filter (hidden on profiles tab) */}
        {tab !== 'profiles' && tab !== 'tasks' && (
          <div className="flex items-center gap-2 mb-5">
            <label className="text-sm font-semibold text-slate-500">View:</label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All Children</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.child_name || c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-semibold">Hours Studied</p>
                    <p className="text-2xl font-display font-extrabold text-slate-800">{totalHours}h</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-semibold">Completion Rate</p>
                    <p className="text-2xl font-display font-extrabold text-slate-800">{completionRate}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-semibold">Badges Earned</p>
                    <p className="text-2xl font-display font-extrabold text-slate-800">
                      {children.filter(c => selectedChild === 'all' || c.id === selectedChild).reduce((s, c) => s + c.badges_earned, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-500" />
                Weekly Study Minutes
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'Nunito' }} />
                  <Bar dataKey="minutes" fill="#14b8a6" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Subject Balance
                </h3>
                {subjectData.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-12">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {subjectData.map((entry) => (
                          <Cell key={entry.name} fill={SUBJECT_COLORS[entry.name] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'Nunito' }} />
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Nunito' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Child Summary
                </h3>
                <div className="space-y-3">
                  {children.filter(c => selectedChild === 'all' || c.id === selectedChild).map((c) => {
                    const cTasks = tasks.filter(t => t.child_id === c.id)
                    const cDone = cTasks.filter(t => t.status === 'completed').length
                    return (
                      <div key={c.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50">
                        <Avatar
                          photoUrl={c.photo_url}
                          outfit={childOutfit(c.active_outfit_id)}
                          size={40}
                          ringClass="ring-2 ring-slate-200"
                        />
                        <div className="flex-1">
                          <p className="font-display font-bold text-slate-700">{c.child_name || c.name}</p>
                          <p className="text-xs text-slate-400 font-semibold">
                            {cDone}/{cTasks.length} tasks · ⭐ {c.points} · Lvl {c.level} · 🔥 {c.streak}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Profiles Tab ── */}
        {tab === 'profiles' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                <UserCog className="w-5 h-5 text-indigo-500" />
                Child Profiles
              </h3>
              <div className="space-y-4">
                {children.map((c) => (
                  <div key={c.id} className="border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar
                        photoUrl={c.photo_url}
                        outfit={childOutfit(c.active_outfit_id)}
                        size={64}
                        ringClass="ring-2 ring-slate-200"
                      />
                      <div className="flex-1">
                        <p className="font-display font-bold text-slate-800 text-lg">
                          {c.child_name || c.name}
                        </p>
                        <p className="text-sm text-slate-400 font-semibold">
                          {c.grade} · Theme: {c.theme_preference} · ⭐ {c.points} · Lvl {c.level}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingChild(c)}
                        className="text-sm font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Parent PIN config */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Parent PIN
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  defaultValue={parent?.parent_pin || ''}
                  onBlur={(e) => {
                    if (parent && e.target.value !== parent.parent_pin) {
                      updateProfile(parent.id, { parent_pin: e.target.value })
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
              <div className="space-y-4">
                {children.map((c) => (
                  <div key={c.id} className="border border-slate-200 rounded-2xl p-4">
                    <p className="font-display font-bold text-slate-700 mb-3">
                      {c.child_name || c.name}
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <p className="text-sm font-semibold text-slate-600">Require PIN for Task Completion</p>
                          <p className="text-xs text-slate-400">Tasks complete instantly when OFF</p>
                        </div>
                        <button
                          onClick={() => updateProfile(c.id, { require_pin_for_tasks: !c.require_pin_for_tasks })}
                          className={`relative w-12 h-7 rounded-full transition-colors ${
                            c.require_pin_for_tasks ? 'bg-indigo-500' : 'bg-slate-300'
                          }`}
                        >
                          <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            c.require_pin_for_tasks ? 'translate-x-5' : ''
                          }`} />
                        </button>
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <p className="text-sm font-semibold text-slate-600">Require PIN to Redeem Rewards</p>
                          <p className="text-xs text-slate-400">Guardian must approve spending points</p>
                        </div>
                        <button
                          onClick={() => updateProfile(c.id, { require_pin_for_rewards: !c.require_pin_for_rewards })}
                          className={`relative w-12 h-7 rounded-full transition-colors ${
                            c.require_pin_for_rewards ? 'bg-indigo-500' : 'bg-slate-300'
                          }`}
                        >
                          <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            c.require_pin_for_rewards ? 'translate-x-5' : ''
                          }`} />
                        </button>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tasks Tab ── */}
        {tab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Create a New Task
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Assign to</label>
                  <select
                    value={formChildId}
                    onChange={(e) => setFormChildId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.child_name || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Subject</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Task Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Read 10 pages of your book"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Icon</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormIcon(icon)}
                        className={`text-xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          formIcon === icon ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Min</label>
                    <input
                      type="number"
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      min={5}
                      step={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Stars</label>
                    <input
                      type="number"
                      value={formPoints}
                      onChange={(e) => setFormPoints(Number(e.target.value))}
                      min={1}
                      step={1}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Due</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={createTask}
                className="w-full mt-4 bg-indigo-500 text-white font-display font-bold py-3 rounded-2xl hover:bg-indigo-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Task
              </button>
            </div>

            <div>
              <h3 className="font-display font-bold text-slate-700 mb-3">All Tasks</h3>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
                    <div className="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl">
                      {task.icon_name}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{task.title}</p>
                      <p className="text-xs text-slate-400">
                        {childName(task.child_id)} · {task.subject} · {task.duration_mins}min · ⭐{task.points_value}
                      </p>
                    </div>
                    {task.status === 'completed' ? (
                      <span className="text-xs font-bold bg-green-100 text-green-600 px-2.5 py-1 rounded-full">Done</span>
                    ) : (
                      <span className="text-xs font-bold bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full">Pending</span>
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-slate-300 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-8">No tasks yet. Create one above!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Rewards Tab ── */}
        {tab === 'rewards' && (
          <div className="space-y-6">
            {/* Approval Queue */}
            <div>
              <h3 className="font-display font-bold text-slate-700 mb-3 flex items-center gap-2">
                Reward Approval Queue
                {claimedRewards.length > 0 && (
                  <span className="bg-rose-400 text-white text-xs px-2 py-0.5 rounded-full">
                    {claimedRewards.length}
                  </span>
                )}
              </h3>
              {claimedRewards.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-slate-400 font-semibold text-sm">No rewards waiting for approval</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {claimedRewards.map((reward) => (
                    <div key={reward.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="text-3xl flex-shrink-0">{reward.icon_name}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-slate-700">{reward.title}</p>
                        <p className="text-xs text-slate-400">
                          {childName(reward.child_id)} · Cost: ⭐{reward.point_cost}
                        </p>
                      </div>
                      <button
                        onClick={() => approveReward(reward)}
                        className="flex items-center gap-1 bg-green-500 text-white font-bold text-sm px-3 py-2 rounded-xl hover:bg-green-400 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => declineReward(reward)}
                        className="flex items-center gap-1 bg-rose-500 text-white font-bold text-sm px-3 py-2 rounded-xl hover:bg-rose-400 transition-all"
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Reward */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Add a Reward
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">For</label>
                  <select
                    value={rFormChildId}
                    onChange={(e) => setRFormChildId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.child_name || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Icon</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['🎁', '🎮', '🍦', '🎬', '🎨', '⛺', '🛹', '🍿'].map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setRFormIcon(icon)}
                        className={`text-xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          rFormIcon === icon ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Reward Title</label>
                  <input
                    type="text"
                    value={rFormTitle}
                    onChange={(e) => setRFormTitle(e.target.value)}
                    placeholder="e.g., 30 Mins Video Games"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Star Cost</label>
                  <input
                    type="number"
                    value={rFormCost}
                    onChange={(e) => setRFormCost(Number(e.target.value))}
                    min={1}
                    step={5}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <button
                onClick={createReward}
                className="w-full mt-4 bg-indigo-500 text-white font-display font-bold py-3 rounded-2xl hover:bg-indigo-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Reward
              </button>
            </div>

            {/* All rewards */}
            <div>
              <h3 className="font-display font-bold text-slate-700 mb-3">All Rewards</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredRewards.map((reward) => (
                  <div key={reward.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
                    <div className="text-2xl flex-shrink-0">{reward.icon_name}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{reward.title}</p>
                      <p className="text-xs text-slate-400">
                        {childName(reward.child_id)} · ⭐{reward.point_cost}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      reward.status === 'approved' ? 'bg-green-100 text-green-600' :
                      reward.status === 'claimed' ? 'bg-amber-100 text-amber-600' :
                      reward.status === 'declined' ? 'bg-rose-100 text-rose-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {reward.status}
                    </span>
                    <button
                      onClick={() => deleteReward(reward.id)}
                      className="text-slate-300 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {filteredRewards.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-8 col-span-2">No rewards yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white font-display font-bold px-6 py-3 rounded-2xl shadow-xl z-50 animate-pop">
          {toast}
        </div>
      )}

      {/* Profile Edit Modal */}
      {editingChild && (
        <ProfileEditModal
          child={editingChild}
          outfits={outfits}
          uploading={uploading}
          onClose={() => setEditingChild(null)}
          onSave={(updates) => {
            updateProfile(editingChild.id, updates)
            setEditingChild(null)
          }}
          onUpload={(file) => handlePhotoUpload(editingChild.id, file)}
        />
      )}
    </div>
  )
}

// ── Profile Edit Modal ──────────────────────────
function ProfileEditModal({
  child, outfits, uploading, onClose, onSave, onUpload,
}: {
  child: Profile
  outfits: Outfit[]
  uploading: boolean
  onClose: () => void
  onSave: (updates: Partial<Profile>) => void
  onUpload: (file: File) => void
}) {
  const [name, setName] = useState(child.child_name || '')
  const [grade, setGrade] = useState(child.grade || '3rd Grade')
  const [theme, setTheme] = useState<'space' | 'unicorn'>(child.theme_preference)
  const [photoUrl, setPhotoUrl] = useState(child.photo_url)
  const equippedOutfit = outfits.find((o) => o.id === child.active_outfit_id) || null

  const handleSave = () => {
    onSave({
      child_name: name,
      grade,
      theme_preference: theme,
      photo_url: photoUrl,
    })
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
      // The upload function updates the DB; we also want a local preview
      const reader = new FileReader()
      reader.onload = (ev) => setPhotoUrl(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-extrabold text-slate-800">Edit Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Photo upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar
              photoUrl={photoUrl}
              outfit={equippedOutfit}
              size={100}
              ringClass="ring-4 ring-indigo-200 shadow-lg"
            />
            <label className="absolute -bottom-1 -right-1 w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-indigo-400 transition-colors">
              <Camera className="w-5 h-5 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          {uploading && (
            <p className="text-sm text-indigo-500 font-semibold mt-2 animate-pulse">Uploading...</p>
          )}
          <p className="text-xs text-slate-400 font-semibold mt-2">Tap camera to upload a photo</p>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Child Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Leo"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Grade */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Grade</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Theme */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Dashboard Theme</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={() => setTheme('space')}
              className={`p-4 rounded-2xl border-2 transition-all text-center ${
                theme === 'space'
                  ? 'border-indigo-500 bg-indigo-50 scale-105'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Rocket className="w-8 h-8 mx-auto mb-1 text-indigo-500" />
              <p className="font-display font-bold text-sm text-slate-700">Space</p>
              <p className="text-xs text-slate-400">Dark + Fuel Cells</p>
            </button>
            <button
              onClick={() => setTheme('unicorn')}
              className={`p-4 rounded-2xl border-2 transition-all text-center ${
                theme === 'unicorn'
                  ? 'border-rose-400 bg-rose-50 scale-105'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-8 h-8 mx-auto mb-1 text-rose-400" />
              <p className="font-display font-bold text-sm text-slate-700">Unicorn</p>
              <p className="text-xs text-slate-400">Pastel + Star Points</p>
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-indigo-500 text-white font-display font-bold py-3 rounded-2xl hover:bg-indigo-400 transition-all"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
