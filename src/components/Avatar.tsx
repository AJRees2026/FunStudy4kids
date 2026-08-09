import type { Outfit } from '../lib/supabase'

type Props = {
  photoUrl: string | null
  outfit: Outfit | null
  size?: number
  ringClass?: string
  className?: string
}

export default function Avatar({
  photoUrl,
  outfit,
  size = 120,
  ringClass = '',
  className = '',
}: Props) {
  return (
    <div
      className={`relative rounded-full overflow-hidden ${ringClass} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Base photo or placeholder */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Child avatar"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-200 to-teal-200 flex items-center justify-center">
          <span className="text-5xl" style={{ fontSize: size * 0.4 }}>
            🧒
          </span>
        </div>
      )}

      {/* Outfit overlay — positioned to cover the avatar */}
      {outfit && (
        <img
          src={outfit.icon_url}
          alt={outfit.title}
          className="absolute inset-0 w-full h-full pointer-events-none object-cover"
          style={{ objectFit: 'cover' }}
        />
      )}
    </div>
  )
}
