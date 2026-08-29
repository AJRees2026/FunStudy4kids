import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase, type Profile } from '../lib/supabase'
import { getTheme, type Theme } from '../lib/themes'
import { useI18n } from '../lib/i18n'
import PhotoCropper, { type Transform } from '../components/PhotoCropper'
import { Camera, Upload, Check, RefreshCw, ArrowRight, CircleAlert as AlertCircle } from 'lucide-react'

type Props = {
  profile: Profile
  onDone: (updated: Profile) => void
}

export default function ChildProfileSetup({ profile, onDone }: Props) {
  const { t } = useI18n()
  const theme: Theme = getTheme(profile.theme_preference)
  const isSpace = profile.theme_preference === 'space'

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [mode, setMode] = useState<'choose' | 'camera' | 'preview'>('choose')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 })

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [stopCamera, previewUrl])

  const startCamera = async () => {
    setCameraError(false)
    setError('')
    setMode('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
    } catch {
      setCameraError(true)
    }
  }

  const captureSelfie = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const size = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2

    canvas.width = 320
    canvas.height = 320
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        setMode('preview')
      }
    }, 'image/jpeg', 0.9)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(t('photoError'))
      return
    }
    setCapturedBlob(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMode('preview')
  }

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setCapturedBlob(null)
    setMode('choose')
    setError('')
  }

  const renderCropped = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!previewUrl) { resolve(null); return }
      const img = new Image()
      img.onload = () => {
        const tf = transformRef.current
        const outSize = 320
        const canvas = canvasRef.current
        if (!canvas) { resolve(null); return }
        canvas.width = outSize
        canvas.height = outSize
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }

        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, outSize, outSize)

        const srcSize = Math.min(img.width, img.height)
        const srcX = (img.width - srcSize) / 2
        const srcY = (img.height - srcSize) / 2

        const drawW = outSize * tf.scale
        const drawH = outSize * tf.scale
        const drawX = (outSize - drawW) / 2 + tf.x
        const drawY = (outSize - drawH) / 2 + tf.y

        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, drawX, drawY, drawW, drawH)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
      }
      img.onerror = () => resolve(null)
      img.src = previewUrl
    })
  }

  const savePhoto = async () => {
    if (!capturedBlob) return
    setSaving(true)
    setError('')

    try {
      const blob = await renderCropped()
      if (!blob) throw new Error('render failed')

      const fileName = `${profile.id}-${Date.now()}.jpg`
      const filePath = `${profile.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const photoUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: photoUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      onDone({ ...profile, photo_url: photoUrl })
    } catch {
      setError(t('photoError'))
    } finally {
      setSaving(false)
    }
  }

  const skip = () => {
    stopCamera()
    onDone(profile)
  }

  return (
    <div className={`min-h-screen ${theme.bgGradient} flex items-center justify-center p-4`}>
      <div className={`max-w-md w-full rounded-3xl p-8 shadow-2xl animate-pop ${theme.cardBg} border ${theme.cardBorder}`}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 mb-4 shadow-lg">
            <Camera className="w-8 h-8 text-black" />
          </div>
          <h2 className={`font-display font-extrabold text-2xl mb-2 text-black`}>
            {t('profileSetup')}
          </h2>
          <p className={`text-sm font-semibold ${theme.textSecondary}`}>
            {t('profileSetupDesc')}
          </p>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={startCamera}
              className={`w-full font-display font-bold text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-teal-500 text-white hover:scale-[1.02] active:scale-95`}
            >
              <Camera className="w-5 h-5" /> {t('takeSelfie')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full font-display font-bold text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border-2 ${
                isSpace
                  ? 'border-slate-600 text-black hover:border-indigo-400 hover:bg-indigo-500/10'
                  : 'border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            >
              <Upload className="w-5 h-5" /> {t('uploadPhoto')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={skip}
              className={`w-full text-sm font-semibold py-2 rounded-xl transition-colors ${theme.textMuted} hover:${theme.textPrimary}`}
            >
              {t('continueToApp')} <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        )}

        {mode === 'camera' && (
          <div className="space-y-4">
            {cameraError ? (
              <div className={`rounded-2xl p-6 text-center ${isSpace ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'}`}>
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
                <p className={`text-sm font-semibold ${isSpace ? 'text-rose-300' : 'text-rose-600'}`}>
                  {t('cameraError')}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-4 w-full font-display font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-teal-500 text-white hover:scale-[1.02] active:scale-95`}
                >
                  <Upload className="w-5 h-5" /> {t('uploadPhoto')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <>
                <div className="relative rounded-2xl overflow-hidden aspect-square bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white/60 text-sm font-semibold animate-pulse">...</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={captureSelfie}
                  disabled={!cameraReady}
                  className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" /> {t('takeSelfie')}
                </button>
              </>
            )}
            <button
              onClick={() => { stopCamera(); setMode('choose') }}
              className={`w-full text-sm font-semibold py-2 rounded-xl transition-colors ${theme.textMuted}`}
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {mode === 'preview' && previewUrl && (
          <div className="space-y-4">
            <PhotoCropper
              src={previewUrl}
              size={280}
              onChange={(tf) => { transformRef.current = tf }}
            />
            <p className={`text-center text-xs font-semibold ${theme.textMuted}`}>
              {t('adjustPhoto')}
            </p>
            {error && (
              <p className="text-rose-400 text-sm font-semibold text-center">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={retake}
                disabled={saving}
                className={`flex-1 font-display font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border-2 ${
                  isSpace
                    ? 'border-slate-600 text-red-500 hover:border-indigo-400 hover:bg-indigo-500/10'
                    : 'border-slate-300 text-red-500 hover:border-indigo-400 hover:bg-indigo-50'
                } disabled:opacity-50`}
              >
                <RefreshCw className="w-5 h-5" /> {t('retakePhoto')}
              </button>
              <button
                onClick={savePhoto}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>{t('saving')}</>
                ) : (
                  <><Check className="w-5 h-5" /> {t('usePhoto')}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
