import { useRef, useState, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

type Props = {
  src: string
  size?: number
  onChange: (transform: Transform) => void
  className?: string
}

export type Transform = {
  scale: number
  x: number
  y: number
}

const MIN_SCALE = 1
const MAX_SCALE = 4

export default function PhotoCropper({ src, size = 320, onChange, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null)

  useEffect(() => {
    setScale(1)
    setPos({ x: 0, y: 0 })
  }, [src])

  useEffect(() => {
    onChange({ scale, x: pos.x, y: pos.y })
  }, [scale, pos, onChange])

  const clampPos = useCallback((x: number, y: number, s: number) => {
    const maxOffset = ((s - 1) * size) / 2
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, y)),
    }
  }, [size])

  const setZoom = (newScale: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    const clampedPos = clampPos(pos.x, pos.y, clamped)
    setScale(clamped)
    setPos(clampedPos)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && (e as any).isPrimary === false) return
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const newPos = clampPos(dragStart.current.posX + dx, dragStart.current.posY + dy, scale)
    setPos(newPos)
  }

  const handlePointerUp = () => {
    setDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.002
    setZoom(scale + delta * scale)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      if (pinchStart.current) {
        const ratio = dist / pinchStart.current.dist
        setZoom(pinchStart.current.scale * ratio)
      } else {
        pinchStart.current = { dist, scale }
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStart.current = null
  }

  const reset = () => {
    setScale(1)
    setPos({ x: 0, y: 0 })
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden bg-black touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt="Profile preview"
          draggable={false}
          className="absolute top-1/2 left-1/2 w-full h-full object-cover pointer-events-none will-change-transform"
          style={{
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 0.05s ease-out',
          }}
        />
        <div className="absolute inset-0 pointer-events-none rounded-2xl ring-2 ring-white/20" />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setZoom(scale - 0.25)}
          disabled={scale <= MIN_SCALE + 0.01}
          className="w-10 h-10 rounded-xl bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-40"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={reset}
          className="w-10 h-10 rounded-xl bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(scale + 0.25)}
          disabled={scale >= MAX_SCALE - 0.01}
          className="w-10 h-10 rounded-xl bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-40"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
