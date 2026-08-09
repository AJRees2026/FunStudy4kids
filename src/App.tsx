import { useState, useEffect, useCallback } from 'react'
import { supabase, type Profile } from './lib/supabase'
import Landing from './pages/Landing'
import KidDashboard from './pages/KidDashboard'
import ParentPortal from './pages/ParentPortal'

type View = 'landing' | 'kid' | 'parent'

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [activeChild, setActiveChild] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshChild = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (data) setActiveChild(data as Profile)
  }, [])

  useEffect(() => {
    supabase.from('profiles').select('id').limit(1).then(() => setLoading(false))
  }, [])

  const handleSelectChild = (child: Profile) => {
    setActiveChild(child)
    setView('kid')
  }

  const handleExitToLanding = () => {
    setActiveChild(null)
    setView('landing')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-100 via-indigo-100 to-rose-100">
        <div className="text-5xl animate-float">📚</div>
      </div>
    )
  }

  if (view === 'parent') {
    return <ParentPortal onExit={handleExitToLanding} />
  }

  if (view === 'kid' && activeChild) {
    return (
      <KidDashboard
        child={activeChild}
        onExit={handleExitToLanding}
        onRefreshChild={refreshChild}
      />
    )
  }

  return (
    <Landing
      onSelectChild={handleSelectChild}
      onGoParent={() => setView('parent')}
    />
  )
}
