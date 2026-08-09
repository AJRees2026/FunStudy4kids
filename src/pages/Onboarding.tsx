import { useState } from 'react'
import { supabase, generatePairCode, type Profile } from '../lib/supabase'
import { Rocket, Sparkles, Users, KeyRound, ArrowRight, Check } from 'lucide-react'

type Props = {
  onLinked: (profile: Profile) => void
}

export default function Onboarding({ onLinked }: Props) {
  const [step, setStep] = useState<'role' | 'parent-setup' | 'child-link'>('role')
  const [parentName, setParentName] = useState('')
  const [childName, setChildName] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [linkError, setLinkError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdParent, setCreatedParent] = useState<Profile | null>(null)

  const handleParentSetup = async () => {
    setLoading(true)
    const code = generatePairCode()
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        role: 'parent',
        name: parentName || 'Parent',
        parent_pin: '1234',
        theme_preference: 'space',
        family_pair_code: code,
        require_pin_for_tasks: true,
        require_pin_for_rewards: true,
      })
      .select()
      .single()
    setLoading(false)
    if (error) { setLinkError(error.message); return }
    setCreatedParent(data as Profile)
    setStep('parent-setup')
  }

  const handleChildLink = async () => {
    setLoading(true)
    setLinkError('')
    const code = pairCode.toUpperCase().trim()
    const { data: parent, error: parentErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('family_pair_code', code)
      .eq('role', 'parent')
      .maybeSingle()

    if (parentErr || !parent) {
      setLoading(false)
      setLinkError('Invalid pair code. Check with your parent and try again.')
      return
    }

    const { data: child, error: childErr } = await supabase
      .from('profiles')
      .insert({
        role: 'child',
        name: childName || 'Child',
        child_name: childName || 'Child',
        theme_preference: 'space',
        linked_parent_id: parent.id,
        require_pin_for_tasks: true,
        require_pin_for_rewards: true,
      })
      .select()
      .single()

    setLoading(false)
    if (childErr) { setLinkError(childErr.message); return }
    localStorage.setItem('activeProfileId', (child as Profile).id)
    onLinked(child as Profile)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Step 1: Role Selection */}
        {step === 'role' && (
          <div className="text-center animate-fadeIn">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-teal-500 mb-4 shadow-lg shadow-indigo-500/30">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <h1 className="font-display font-extrabold text-3xl text-white mb-2">StudyPulse Kids</h1>
              <p className="text-slate-400 font-semibold">Let's get started! Are you a parent or a child?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep('parent-setup')}
                className="group bg-slate-800/80 border border-slate-700 rounded-3xl p-6 hover:border-indigo-500 hover:scale-105 active:scale-95 transition-all"
              >
                <Users className="w-10 h-10 text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-display font-bold text-white text-lg">Parent</p>
                <p className="text-xs text-slate-400 mt-1">Set up & manage</p>
              </button>
              <button
                onClick={() => setStep('child-link')}
                className="group bg-slate-800/80 border border-slate-700 rounded-3xl p-6 hover:border-teal-500 hover:scale-105 active:scale-95 transition-all"
              >
                <Sparkles className="w-10 h-10 text-teal-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-display font-bold text-white text-lg">Child</p>
                <p className="text-xs text-slate-400 mt-1">Link & start learning</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2a: Parent Setup */}
        {step === 'parent-setup' && !createdParent && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 animate-fadeIn">
            <button onClick={() => setStep('role')} className="text-slate-400 hover:text-white text-sm font-semibold mb-4">
              ← Back
            </button>
            <h2 className="font-display font-extrabold text-2xl text-white mb-2">Parent Setup</h2>
            <p className="text-slate-400 text-sm font-semibold mb-6">Enter your name to create your parent account.</p>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Your name (e.g. Mom & Dad)"
              className="w-full bg-slate-900/60 text-white rounded-2xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-500"
              autoFocus
            />
            <button
              onClick={handleParentSetup}
              disabled={loading || !parentName.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating...' : <>Create Account <ArrowRight className="w-5 h-5" /></>}
            </button>
            {linkError && <p className="text-rose-400 text-sm mt-3 font-semibold">{linkError}</p>}
          </div>
        )}

        {/* Step 2b: Parent Created — Show Pair Code */}
        {step === 'parent-setup' && createdParent && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center animate-pop">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 mb-4">
              <Check className="w-8 h-8 text-teal-400" />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-white mb-2">Account Created!</h2>
            <p className="text-slate-400 text-sm font-semibold mb-6">Share this code with your child to link their device.</p>
            <div className="bg-slate-900/80 border-2 border-dashed border-indigo-500 rounded-2xl p-6 mb-6">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Family Pair Code</p>
              <p className="font-display font-extrabold text-4xl text-white tracking-wider">{createdParent.family_pair_code}</p>
            </div>
            <button
              onClick={() => { localStorage.setItem('activeProfileId', createdParent.id); onLinked(createdParent) }}
              className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Go to Parent Portal <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 3: Child Link */}
        {step === 'child-link' && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 animate-fadeIn">
            <button onClick={() => setStep('role')} className="text-slate-400 hover:text-white text-sm font-semibold mb-4">
              ← Back
            </button>
            <h2 className="font-display font-extrabold text-2xl text-white mb-2">Link to Parent</h2>
            <p className="text-slate-400 text-sm font-semibold mb-6">Enter your name and the Family Pair Code from your parent.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Leo"
                  className="w-full bg-slate-900/60 text-white rounded-2xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder-slate-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Family Pair Code
                </label>
                <input
                  type="text"
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                  placeholder="SP-XXXX"
                  maxLength={8}
                  className="w-full bg-slate-900/60 text-white rounded-2xl px-4 py-3 mt-1 text-center text-2xl font-display font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder-slate-600"
                />
              </div>
            </div>
            <button
              onClick={handleChildLink}
              disabled={loading || !childName.trim() || !pairCode.trim()}
              className="w-full mt-6 bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Linking...' : <>Link Device <ArrowRight className="w-5 h-5" /></>}
            </button>
            {linkError && <p className="text-rose-400 text-sm mt-3 font-semibold">{linkError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
