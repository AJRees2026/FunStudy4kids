import { useEffect, useState } from 'react'

const COLORS = ['#fbbf24', '#14b8a6', '#6366f1', '#fb7185', '#a78bfa', '#34d399']

export default function Confetti({ fire }: { fire: boolean }) {
  const [pieces, setPieces] = useState<
    { id: number; left: number; delay: number; color: string; size: number }[]
  >([])

  useEffect(() => {
    if (!fire) return
    const newPieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: COLORS[i % COLORS.length],
      size: 8 + Math.random() * 8,
    }))
    setPieces(newPieces)
    const timer = setTimeout(() => setPieces([]), 3500)
    return () => clearTimeout(timer)
  }, [fire])

  if (pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confettiFall"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.id % 2 === 0 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
