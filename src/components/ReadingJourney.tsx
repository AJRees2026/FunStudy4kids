import { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, Plus, Star, X, Trash2, Pencil, Award, BookMarked, Camera, Upload, ImageIcon } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { supabase, type Book, type BookStatus } from '../lib/supabase'
import type { Theme } from '../lib/themes'

type ReadingJourneyProps = {
  childId: string
  theme: Theme
  isSpace: boolean
  onStarsAwarded?: (count: number) => void
}

type Milestone = {
  threshold: number
  labelKey: string
  icon: typeof Award
  color: string
}

const MILESTONES: Milestone[] = [
  { threshold: 1, labelKey: 'firstBookFinished', icon: Award, color: 'from-sky-400 to-blue-500' },
  { threshold: 5, labelKey: 'fiveBooksClub', icon: Award, color: 'from-amber-400 to-orange-500' },
  { threshold: 20, labelKey: 'twentyBooksHero', icon: Award, color: 'from-emerald-400 to-teal-500' },
  { threshold: 50, labelKey: 'fiftyBooksAchiever', icon: Award, color: 'from-rose-400 to-fuchsia-500' },
]

const STATUS_STYLES: Record<BookStatus, { labelKey: string; bg: string; text: string; dot: string }> = {
  want_to_read: { labelKey: 'wantToRead', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  in_progress: { labelKey: 'inProgress', bg: 'bg-amber-100', text: 'text-amber-600', dot: 'bg-amber-400' },
  completed: { labelKey: 'completedStatus', bg: 'bg-emerald-100', text: 'text-emerald-600', dot: 'bg-emerald-400' },
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ReadingJourney({ childId, theme, isSpace, onStarsAwarded }: ReadingJourneyProps) {
  const { t } = useI18n()
  const [books, setBooks] = useState<Book[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    author: '',
    total_pages: '',
    current_page: '0',
    isbn: '',
    status: 'want_to_read' as BookStatus,
    start_date: '',
    completion_date: '',
  })

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverMode, setCoverMode] = useState<'idle' | 'camera' | 'preview'>('idle')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const fetchBooks = useCallback(async () => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
    if (data) setBooks(data as Book[])
  }, [childId])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const openAddModal = () => {
    setEditingBook(null)
    setForm({
      title: '', author: '', total_pages: '', current_page: '0',
      isbn: '', status: 'want_to_read', start_date: '', completion_date: '',
    })
    setCoverUrl(null)
    setCoverMode('idle')
    setCoverPreview(null)
    setCoverBlob(null)
    setShowModal(true)
  }

  const openEditModal = (book: Book) => {
    setEditingBook(book)
    setForm({
      title: book.title,
      author: book.author,
      total_pages: String(book.total_pages),
      current_page: String(book.current_page),
      isbn: book.isbn || '',
      status: book.status,
      start_date: book.start_date || '',
      completion_date: book.completion_date || '',
    })
    setCoverUrl(book.cover_url || null)
    setCoverMode('idle')
    setCoverPreview(null)
    setCoverBlob(null)
    setShowModal(true)
  }

  const startCamera = async () => {
    setCameraError(false)
    setCoverMode('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
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

  const captureCover = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    const size = Math.min(vw, vh)
    const sx = (vw - size) / 2
    const sy = (vh - size) / 2

    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (blob) {
        setCoverBlob(blob)
        setCoverPreview(URL.createObjectURL(blob))
        setCoverMode('preview')
      }
    }, 'image/jpeg', 0.9)

    stopCamera()
  }

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setCoverBlob(file)
    setCoverPreview(URL.createObjectURL(file))
    setCoverMode('preview')
  }

  const removeCover = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverBlob(null)
    setCoverPreview(null)
    setCoverUrl(null)
    setCoverMode('idle')
  }

  const uploadCover = async (): Promise<string | null> => {
    if (!coverBlob) return coverUrl
    const fileName = `${childId}-${Date.now()}.jpg`
    const filePath = `${childId}/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(filePath, coverBlob, { contentType: 'image/jpeg', upsert: false })
    if (uploadError) return coverUrl
    const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  const saveBook = async () => {
    const totalPages = parseInt(form.total_pages, 10)
    if (!form.title.trim() || !form.author.trim() || !totalPages || totalPages <= 0) return

    const currentPage = Math.min(parseInt(form.current_page, 10) || 0, totalPages)
    let status = form.status
    let startDate = form.start_date || null
    let completionDate = form.completion_date || null

    if (status === 'in_progress' && !startDate) startDate = todayStr()
    if (status === 'completed') {
      if (!startDate) startDate = todayStr()
      if (!completionDate) completionDate = todayStr()
    }

    const finalCoverUrl = await uploadCover()

    if (editingBook) {
      const wasCompleted = editingBook.status === 'completed'
      const nowCompleted = status === 'completed'

      await supabase.from('books').update({
        title: form.title.trim(),
        author: form.author.trim(),
        total_pages: totalPages,
        current_page: currentPage,
        isbn: form.isbn.trim() || null,
        cover_url: finalCoverUrl,
        status,
        start_date: startDate,
        completion_date: completionDate,
        updated_at: new Date().toISOString(),
      }).eq('id', editingBook.id)

      if (!wasCompleted && nowCompleted) {
        const completedCount = books.filter((b) => b.status === 'completed').length + 1
        const starsForMilestone = checkMilestoneStars(completedCount)
        if (starsForMilestone > 0 && onStarsAwarded) {
          onStarsAwarded(starsForMilestone)
          showToast(`${starsForMilestone} ${t('starsAwarded')}`)
        } else {
          showToast(t('bookUpdated'))
        }
      } else {
        showToast(t('bookUpdated'))
      }
    } else {
      const { data } = await supabase.from('books').insert({
        child_id: childId,
        title: form.title.trim(),
        author: form.author.trim(),
        total_pages: totalPages,
        current_page: currentPage,
        isbn: form.isbn.trim() || null,
        cover_url: finalCoverUrl,
        status,
        start_date: startDate,
        completion_date: completionDate,
      }).select()

      if (status === 'completed' && data) {
        const completedCount = books.filter((b) => b.status === 'completed').length + 1
        const starsForMilestone = checkMilestoneStars(completedCount)
        if (starsForMilestone > 0 && onStarsAwarded) {
          onStarsAwarded(starsForMilestone)
          showToast(`${starsForMilestone} ${t('starsAwarded')}`)
        } else {
          showToast(t('bookAdded'))
        }
      } else {
        showToast(t('bookAdded'))
      }
    }

    if (coverPreview) URL.revokeObjectURL(coverPreview)
    stopCamera()
    setShowModal(false)
    fetchBooks()
  }

  const deleteBook = async (book: Book) => {
    await supabase.from('books').delete().eq('id', book.id)
    showToast(t('bookDeleted'))
    fetchBooks()
  }

  const completedBooks = books.filter((b) => b.status === 'completed')
  const totalPagesRead = completedBooks.reduce((sum, b) => sum + b.total_pages, 0)
  const earnedMilestones = MILESTONES.filter((m) => completedBooks.length >= m.threshold)

  const displayCover = coverMode === 'preview' && coverPreview ? coverPreview : coverUrl

  return (
    <section className={`rounded-3xl p-4 ${theme.cardBg} border ${theme.cardBorder}`}>
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookMarked className={`w-5 h-5 ${theme.accent}`} />
          <div>
            <h2 className={`font-display font-extrabold text-xl ${theme.textPrimary}`}>{t('readingJourney')}</h2>
            <p className={`text-xs font-semibold mt-0.5 ${theme.textMuted}`}>
              {completedBooks.length} {t('booksCompleted')} · {totalPagesRead} {t('pagesRead')}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className={`shrink-0 rounded-xl px-3 py-2 font-display font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 bg-gradient-to-r ${theme.buttonGradient} flex items-center gap-1.5`}
        >
          <Plus className="w-4 h-4" /> {t('addBook')}
        </button>
      </div>

      {earnedMilestones.length > 0 && (
        <div className="mb-4">
          <h3 className={`text-xs font-bold uppercase mb-2 ${theme.textMuted}`}>{t('milestoneBadges')}</h3>
          <div className="flex flex-wrap gap-2">
            {MILESTONES.map((m) => {
              const earned = completedBooks.length >= m.threshold
              const Icon = m.icon
              return (
                <div
                  key={m.threshold}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    earned
                      ? `bg-gradient-to-r ${m.color} text-white shadow-md`
                      : isSpace ? 'bg-slate-700/50 text-slate-500' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${earned ? 'fill-current' : ''}`} />
                  {t(m.labelKey)}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className={`rounded-2xl p-6 text-center ${isSpace ? 'bg-white/5' : 'bg-slate-50'}`}>
          <BookOpen className={`w-10 h-10 mx-auto mb-2 ${theme.textMuted}`} />
          <p className={`font-display font-bold text-sm ${theme.textSecondary}`}>{t('noBooksYet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {books.map((book) => {
            const progress = book.total_pages > 0 ? Math.min(100, Math.round((book.current_page / book.total_pages) * 100)) : 0
            const style = STATUS_STYLES[book.status]
            return (
              <div
                key={book.id}
                className={`rounded-2xl p-3 border transition-all hover:scale-[1.02] ${
                  isSpace ? 'bg-white/5 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                }`}
              >
                <div className={`relative h-28 rounded-xl mb-2 flex items-center justify-center overflow-hidden ${
                  isSpace ? 'bg-gradient-to-br from-indigo-900/60 to-slate-800' : 'bg-gradient-to-br from-indigo-100 to-slate-100'
                }`}>
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className={`w-8 h-8 ${isSpace ? 'text-indigo-400' : 'text-indigo-300'}`} />
                  )}
                  <div className={`absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {t(style.labelKey)}
                  </div>
                  {book.status === 'completed' && (
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <Star className="w-2.5 h-2.5 fill-current" />
                    </div>
                  )}
                </div>

                <h3 className={`font-display font-bold text-sm ${theme.textPrimary} truncate`} title={book.title}>{book.title}</h3>
                <p className={`text-xs ${theme.textMuted} truncate`}>{book.author}</p>

                <div className="mt-2">
                  <div className={`h-1.5 rounded-full overflow-hidden ${isSpace ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${book.status === 'completed' ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className={`text-[10px] font-bold mt-1 ${theme.textMuted}`}>
                    {book.current_page}/{book.total_pages} {t('pages')} · {progress}%
                  </p>
                </div>

                {(book.start_date || book.completion_date) && (
                  <p className={`text-[10px] mt-1 ${theme.textMuted}`}>
                    {book.start_date && `${book.start_date}`}
                    {book.start_date && book.completion_date && ' → '}
                    {book.completion_date && book.completion_date}
                  </p>
                )}

                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => openEditModal(book)}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all hover:opacity-80 ${
                      isSpace ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Pencil className="w-3 h-3" /> {t('editBook')}
                  </button>
                  <button
                    onClick={() => deleteBook(book)}
                    className={`flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:opacity-80 ${
                      isSpace ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-500'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => { stopCamera(); setShowModal(false) }}>
          <div
            className={`rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop max-h-[90vh] overflow-y-auto ${
              isSpace ? 'bg-slate-800 border border-slate-700' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-display font-extrabold text-lg ${theme.textPrimary}`}>
                {editingBook ? t('editBook') : t('addBook')}
              </h2>
              <button onClick={() => { stopCamera(); setShowModal(false) }} className={`p-1.5 rounded-lg transition-colors ${theme.textMuted} hover:opacity-70`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Cover Photo Section */}
              <div>
                <label className={`text-xs font-bold mb-1.5 block ${theme.textMuted}`}>{t('coverPhoto')}</label>

                {coverMode === 'idle' && !displayCover && (
                  <div className="flex gap-2">
                    <button
                      onClick={startCamera}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 bg-gradient-to-r ${theme.buttonGradient} text-white`}
                    >
                      <Camera className="w-4 h-4" /> {t('photographCover')}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all border-2 ${
                        isSpace
                          ? 'border-slate-600 text-slate-200 hover:border-indigo-400 hover:bg-indigo-500/10'
                          : 'border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
                      }`}
                    >
                      <Upload className="w-4 h-4" /> {t('uploadCover')}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {coverMode === 'camera' && (
                  <div className="space-y-2">
                    {cameraError ? (
                      <div className={`rounded-2xl p-4 text-center ${isSpace ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'}`}>
                        <p className={`text-xs font-semibold ${isSpace ? 'text-rose-300' : 'text-rose-600'}`}>{t('cameraUnavailable')}</p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className={`mt-2 w-full font-display font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r ${theme.buttonGradient} text-white`}
                        >
                          <Upload className="w-4 h-4" /> {t('uploadCover')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative rounded-2xl overflow-hidden aspect-square bg-black">
                          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                          {!cameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-white/60 text-sm font-semibold animate-pulse">...</div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={captureCover}
                          disabled={!cameraReady}
                          className={`w-full font-display font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r ${theme.buttonGradient} text-white disabled:opacity-50`}
                        >
                          <Camera className="w-4 h-4" /> {t('photographCover')}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { stopCamera(); setCoverMode('idle') }}
                      className={`w-full text-xs font-semibold py-1.5 rounded-lg ${theme.textMuted}`}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                )}

                {(coverMode === 'preview' || (coverMode === 'idle' && displayCover)) && (
                  <div className="space-y-2">
                    <div className={`relative rounded-2xl overflow-hidden h-32 flex items-center justify-center ${
                      isSpace ? 'bg-gradient-to-br from-indigo-900/60 to-slate-800' : 'bg-gradient-to-br from-indigo-100 to-slate-100'
                    }`}>
                      {displayCover ? (
                        <img src={displayCover} alt={t('coverPhoto')} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className={`w-8 h-8 ${isSpace ? 'text-indigo-400' : 'text-indigo-300'}`} />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={startCamera}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all hover:opacity-80 ${
                          isSpace ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" /> {t('photographCover')}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all hover:opacity-80 ${
                          isSpace ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" /> {t('uploadCover')}
                      </button>
                      <button
                        onClick={removeCover}
                        className={`flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition-all hover:opacity-80 ${
                          isSpace ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-500'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('bookTitle')} *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                    isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  } focus:border-indigo-400`}
                />
              </div>

              <div>
                <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('bookAuthor')} *</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                    isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  } focus:border-indigo-400`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('totalPages')} *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.total_pages}
                    onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                      isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    } focus:border-indigo-400`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('currentPage')}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.current_page}
                    onChange={(e) => setForm({ ...form, current_page: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                      isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    } focus:border-indigo-400`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('isbnOptional')}</label>
                <input
                  type="text"
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                    isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  } focus:border-indigo-400`}
                />
              </div>

              <div>
                <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('readingStatus')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['want_to_read', 'in_progress', 'completed'] as BookStatus[]).map((s) => {
                    const st = STATUS_STYLES[s]
                    return (
                      <button
                        key={s}
                        onClick={() => setForm({ ...form, status: s })}
                        className={`rounded-xl py-2 text-xs font-bold transition-all ${
                          form.status === s
                            ? `${st.bg} ${st.text} ring-2 ring-offset-1 ${isSpace ? 'ring-offset-slate-800' : 'ring-offset-white'} ring-indigo-400`
                            : isSpace ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {t(st.labelKey)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('startDate')}</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                      isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    } focus:border-indigo-400`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold mb-1 block ${theme.textMuted}`}>{t('completionDate')}</label>
                  <input
                    type="date"
                    value={form.completion_date}
                    onChange={(e) => setForm({ ...form, completion_date: e.target.value })}
                    className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none border ${
                      isSpace ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    } focus:border-indigo-400`}
                  />
                </div>
              </div>

              <button
                onClick={saveBook}
                disabled={!form.title.trim() || !form.author.trim() || !form.total_pages}
                className={`w-full font-display font-bold py-3 rounded-2xl transition-all ${
                  form.title.trim() && form.author.trim() && form.total_pages
                    ? `text-white hover:scale-[1.02] active:scale-95 bg-gradient-to-r ${theme.buttonGradient}`
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {t('saveBook')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs">
          <div className={`bg-gradient-to-r ${theme.buttonGradient} text-white font-display font-bold px-5 py-3 rounded-2xl shadow-2xl animate-pop flex items-center gap-2`}>
            <Star className="w-4 h-4 fill-current" />
            {toast}
          </div>
        </div>
      )}
    </section>
  )
}

function checkMilestoneStars(completedCount: number): number {
  let stars = 0
  for (const m of MILESTONES) {
    if (completedCount === m.threshold) stars += 1
  }
  if (completedCount > 5 && completedCount % 5 === 0) stars += 1
  return stars
}


export default ReadingJourney