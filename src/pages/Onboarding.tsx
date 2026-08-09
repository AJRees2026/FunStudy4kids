import { useState } from 'react'
import { supabase, generatePairCode, type Profile } from '../lib/supabase'
import { useI18n, LANGUAGES, type LangCode } from '../lib/i18n'
import { Rocket, Sparkles, Users, KeyRound, ArrowRight, Check, Globe, Mic } from 'lucide-react'
import DictationButton from '../components/DictationButton'

type Props = {
  onLinked: (profile: Profile) => void
}

type Step = 'language' | 'role' | 'parent-setup' | 'parent-created' | 'child-link'

export default function Onboarding({ onLinked }: Props) {
  const { lang, setLang, t } = useI18n()
  const [step, setStep] = useState<Step>('language')
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
        task_approval_mode: 'off',
      })
      .select()
      .single()
    setLoading(false)
    if (error) { setLinkError(error.message); return }
    setCreatedParent(data as Profile)
    setStep('parent-created')
  }

  const handleChildLink = async () => {
    setLoading(true)
    setLinkError('')
    const code = pairCode.trim()
    const { data: parent, error: parentErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('family_pair_code', code)
      .eq('role', 'parent')
      .maybeSingle()

    if (parentErr || !parent) {
      setLoading(false)
      setLinkError(t('invalidCode'))
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
        task_approval_mode: 'off',
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
        {/* Step 0: Language Selection */}
        {step === 'language' && (
          <div className="text-center animate-fadeIn">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-teal-500 mb-4 shadow-lg shadow-indigo-500/30">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <h1 className="font-display font-extrabold text-3xl text-white mb-2">{t('appName')}</h1>
              <p className="text-slate-400 font-semibold">{t('chooseLanguage')}</p>
            </div>
            <div className="space-y-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code as LangCode)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-5 py-4 font-display font-bold text-lg transition-all ${
                    lang === l.code
                      ? 'bg-gradient-to-r from-indigo-500 to-teal-500 text-white shadow-lg scale-[1.02]'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-indigo-500 hover:scale-[1.01]'
                  }`}
                >
                  <span className="text-2xl">{l.flag}</span>
                  <span className="flex-1 text-left">{l.label}</span>
                  {lang === l.code && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('role')}
              className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {t('welcome')} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 1: Role Selection */}
        {step === 'role' && (
          <div className="text-center animate-fadeIn">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-teal-500 mb-4 shadow-lg shadow-indigo-500/30">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <h1 className="font-display font-extrabold text-3xl text-white mb-2">{t('appName')}</h1>
              <p className="text-slate-400 font-semibold">{t('areYouParentOrChild')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep('parent-setup')}
                className="group bg-slate-800/80 border border-slate-700 rounded-3xl p-6 hover:border-indigo-500 hover:scale-105 active:scale-95 transition-all"
              >
                <Users className="w-10 h-10 text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-display font-bold text-white text-lg">{t('iAmGuardian')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('guardianSetup')}</p>
              </button>
              <button
                onClick={() => setStep('child-link')}
                className="group bg-slate-800/80 border border-slate-700 rounded-3xl p-6 hover:border-teal-500 hover:scale-105 active:scale-95 transition-all"
              >
                <Sparkles className="w-10 h-10 text-teal-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-display font-bold text-white text-lg">{t('iAmChild')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('linkToParent')}</p>
              </button>
            </div>
            <button
              onClick={() => setStep('language')}
              className="mt-6 text-slate-400 hover:text-white text-sm font-semibold flex items-center gap-1.5 mx-auto"
            >
              <Globe className="w-4 h-4" /> {LANGUAGES.find(l => l.code === lang)?.flag} {LANGUAGES.find(l => l.code === lang)?.label}
            </button>
          </div>
        )}

        {/* Step 2a: Parent Setup */}
        {step === 'parent-setup' && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 animate-fadeIn">
            <button onClick={() => setStep('role')} className="text-slate-400 hover:text-white text-sm font-semibold mb-4">
              ← {t('cancel')}
            </button>
            <h2 className="font-display font-extrabold text-2xl text-white mb-2">{t('guardianSetup')}</h2>
            <p className="text-slate-400 text-sm font-semibold mb-6">{t('enterName')}</p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder={t('yourName')}
                lang={lang}
                spellCheck={true}
                className="flex-1 bg-slate-900/60 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-500"
                autoFocus
              />
              <DictationButton onTranscribe={setParentName} />
            </div>
            <button
              onClick={handleParentSetup}
              disabled={loading || !parentName.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? t('creating') : <>{t('createAccount')} <ArrowRight className="w-5 h-5" /></>}
            </button>
            {linkError && <p className="text-rose-400 text-sm mt-3 font-semibold">{linkError}</p>}
          </div>
        )}

        {/* Step 2b: Parent Created — Show Pair Code */}
        {step === 'parent-created' && createdParent && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center animate-pop">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 mb-4">
              <Check className="w-8 h-8 text-teal-400" />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-white mb-2">{t('accountCreated')}</h2>
            <p className="text-slate-400 text-sm font-semibold mb-6">{t('shareCode')}</p>
            <div className="bg-slate-900/80 border-2 border-dashed border-indigo-500 rounded-2xl p-6 mb-6">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{t('familyPairCode')}</p>
              <p className="font-display font-extrabold text-5xl text-white tracking-[0.3em]">{createdParent.family_pair_code}</p>
            </div>
            <button
              onClick={() => { localStorage.setItem('activeProfileId', createdParent.id); onLinked(createdParent) }}
              className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {t('goToParentPortal')} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 3: Child Link */}
        {step === 'child-link' && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 animate-fadeIn">
            <button onClick={() => setStep('role')} className="text-slate-400 hover:text-white text-sm font-semibold mb-4">
              ← {t('cancel')}
            </button>
            <h2 className="font-display font-extrabold text-2xl text-white mb-2">{t('linkToParent')}</h2>
            <p className="text-slate-400 text-sm font-semibold mb-6">{t('enterNameAndCode')}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('childName')}</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder={t('childName')}
                    lang={lang}
                    spellCheck={true}
                    className="flex-1 bg-slate-900/60 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder-slate-500"
                    autoFocus
                  />
                  <DictationButton onTranscribe={setChildName} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> {t('pairCode')}
                </label>
                <input
                  type="text"
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  className="w-full bg-slate-900/60 text-white rounded-2xl px-4 py-3 mt-1 text-center text-3xl font-display font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder-slate-600"
                />
              </div>
            </div>
            <button
              onClick={handleChildLink}
              disabled={loading || !childName.trim() || pairCode.length !== 6}
              className="w-full mt-6 bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? t('linking') : <>{t('linkDevice')} <ArrowRight className="w-5 h-5" /></>}
            </button>
            {linkError && <p className="text-rose-400 text-sm mt-3 font-semibold">{linkError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
