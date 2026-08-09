import { useState, useEffect } from 'react'
import { supabase, type Profile, type Outfit } from '../lib/supabase'
import Avatar from '../components/Avatar'
import { Shield } from 'lucide-react'

export default function Landing({
  onSelectChild,
  onGoParent,
}: {
  onSelectChild: (child: Profile) => void
  onGoParent: () => void
}) {
  const [children, setChildren] = useState<Profile[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'child')
      .order('name')
      .then(({ data }) => {
        if (data) setChildren(data as Profile[])
      })
    supabase.from('outfits').select('*').then(({ data }) => {
      if (data) setOutfits(data as Outfit[])
    })
  }, [])

  const getOutfit = (outfitId: string | null) =>
    outfits.find((o) => o.id === outfitId) || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-200 via-indigo-200 to-rose-200 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10 animate-slideUp">
        <div className="text-7xl mb-4 animate-float">📚</div>
        <h1 className="text-5xl md:text-6xl font-display font-extrabold text-white drop-shadow-lg mb-2">
          StudyPulse Kids
        </h1>
        <p className="text-lg text-white/90 font-semibold">
          Learn. Earn Stars. Get Rewards.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-display font-bold text-white text-center mb-6 drop-shadow">
          Who's studying today?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => onSelectChild(child)}
              className="group bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 text-center"
            >
              <div className="flex justify-center mb-3 group-hover:animate-wiggle">
                <Avatar
                  photoUrl={child.photo_url}
                  outfit={getOutfit(child.active_outfit_id)}
                  size={100}
                  ringClass="ring-4 ring-white shadow-lg"
                />
              </div>
              <h3 className="text-2xl font-display font-bold text-slate-800">
                {child.child_name || child.name}
              </h3>
              {child.grade && (
                <p className="text-slate-500 font-semibold">{child.grade}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">
                  ⭐ {child.points}
                </span>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                  Lvl {child.level}
                </span>
                <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-bold">
                  🔥 {child.streak}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onGoParent}
        className="mt-10 flex items-center gap-2 bg-white/30 backdrop-blur-sm text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/50 transition-all"
      >
        <Shield className="w-5 h-5" />
        Parent Portal
      </button>
    </div>
  )
}
