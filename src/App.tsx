import { useState, useEffect } from 'react'
import { supabase, type Profile } from './lib/supabase'
import { I18nProvider, useI18n, type LangCode } from './lib/i18n'
import Onboarding from './pages/Onboarding'
import KidDashboard from './pages/KidDashboard'
import ParentPortal from './pages/ParentPortal'
import ChildProfileSetup from './pages/ChildProfileSetup'

function AppInner() {
  const { setLang } = useI18n()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('activeProfileId')
    if (!id) { setLoading(false); return }
    supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p = data as Profile
          setProfile(p)
          if (p.language) setLang(p.language as LangCode)
          if (!p.photo_url) {
            setNeedsProfileSetup(true)
          }
        } else {
          localStorage.removeItem('activeProfileId')
        }
        setLoading(false)
      })
  }, [])

  const handleSwitchProfile = () => {
    localStorage.removeItem('activeProfileId')
    setProfile(null)
    setNeedsProfileSetup(false)
  }

  return (
    <>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
          <div className="text-white font-display font-bold text-xl animate-pulse">Loading...</div>
        </div>
      ) : !profile ? (
        <Onboarding onLinked={(p) => {
          setProfile(p)
          if (!p.photo_url) {
            setNeedsProfileSetup(true)
          }
        }} />
      ) : needsProfileSetup ? (
        <ChildProfileSetup
          profile={profile}
          onDone={(updated) => {
            setProfile(updated)
            setNeedsProfileSetup(false)
          }}
        />
      ) : profile.role === 'parent' ? (
        <ParentPortal parent={profile} onSwitchProfile={handleSwitchProfile} />
      ) : (
        <KidDashboard child={profile} onSwitchProfile={handleSwitchProfile} />
      )}
    </>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  )
}
