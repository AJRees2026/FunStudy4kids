import { useState, useEffect } from 'react'
import { supabase, type Profile } from './lib/supabase'
import { I18nProvider } from './lib/i18n'
import Onboarding from './pages/Onboarding'
import KidDashboard from './pages/KidDashboard'
import ParentPortal from './pages/ParentPortal'

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem('activeProfileId')
    if (!id) { setLoading(false); return }
    supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data as Profile)
        else localStorage.removeItem('activeProfileId')
        setLoading(false)
      })
  }, [])

  const handleSwitchProfile = () => {
    localStorage.removeItem('activeProfileId')
    setProfile(null)
  }

  return (
    <I18nProvider>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
          <div className="text-white font-display font-bold text-xl animate-pulse">Loading...</div>
        </div>
      ) : !profile ? (
        <Onboarding onLinked={(p) => setProfile(p)} />
      ) : profile.role === 'parent' ? (
        <ParentPortal parent={profile} onSwitchProfile={handleSwitchProfile} />
      ) : (
        <KidDashboard child={profile} onSwitchProfile={handleSwitchProfile} />
      )}
    </I18nProvider>
  )
}
