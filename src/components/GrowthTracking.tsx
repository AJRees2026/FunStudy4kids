import { useState, useEffect, useCallback } from 'react'
import { supabase, type Profile, type GrowthEntry } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import GrowthChart from './GrowthChart'
import ScatterPlot from './ScatterPlot'
import { Plus, Ruler, Weight, Trash2, Download, X, CreditCard as Edit3, ScatterChart, BarChart3 } from 'lucide-react'

type Props = {
  children: Profile[]
}

export default function GrowthTracking({ children }: Props) {
  const { t } = useI18n()
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [entries, setEntries] = useState<GrowthEntry[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [metric, setMetric] = useState<'height' | 'weight'>('height')
  const [chartMode, setChartMode] = useState<'percentile' | 'scatter'>('percentile')
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')
  const [editingEntry, setEditingEntry] = useState<GrowthEntry | null>(null)
  const [formData, setFormData] = useState({
    recorded_at: new Date().toISOString().slice(0, 10),
    height: '',
    weight: '',
    notes: '',
  })

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  const fetchEntries = useCallback(async () => {
    if (!selectedChildId) return
    const { data } = await supabase
      .from('growth_entries')
      .select('*')
      .eq('child_id', selectedChildId)
      .order('recorded_at', { ascending: true })
    if (data) setEntries(data as GrowthEntry[])
  }, [selectedChildId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const selectedChild = children.find(c => c.id === selectedChildId)

  // Calculate age in years from a birthdate approximation (we use created_at as proxy if no birthdate)
  const childAgeYears = selectedChild ? 6 : null // Default approximation; real app would need DOB

  const handleSave = async () => {
    if (!selectedChildId) return
    const heightCm = unitSystem === 'metric'
      ? (formData.height ? parseFloat(formData.height) : null)
      : (formData.height ? parseFloat(formData.height) * 2.54 : null)
    const weightKg = unitSystem === 'metric'
      ? (formData.weight ? parseFloat(formData.weight) : null)
      : (formData.weight ? parseFloat(formData.weight) * 0.453592 : null)

    await supabase.from('growth_entries').insert({
      child_id: selectedChildId,
      recorded_at: formData.recorded_at,
      height_cm: heightCm,
      weight_kg: weightKg,
      notes: formData.notes || null,
    })
    setShowAddModal(false)
    setFormData({ recorded_at: new Date().toISOString().slice(0, 10), height: '', weight: '', notes: '' })
    fetchEntries()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('growth_entries').delete().eq('id', id)
    fetchEntries()
  }

  const handleEditSave = async () => {
    if (!editingEntry) return
    const heightCm = unitSystem === 'metric'
      ? (formData.height ? parseFloat(formData.height) : null)
      : (formData.height ? parseFloat(formData.height) * 2.54 : null)
    const weightKg = unitSystem === 'metric'
      ? (formData.weight ? parseFloat(formData.weight) : null)
      : (formData.weight ? parseFloat(formData.weight) * 0.453592 : null)
    await supabase.from('growth_entries').update({
      recorded_at: formData.recorded_at,
      height_cm: heightCm,
      weight_kg: weightKg,
      notes: formData.notes || null,
    }).eq('id', editingEntry.id)
    setEditingEntry(null)
    setFormData({ recorded_at: new Date().toISOString().slice(0, 10), height: '', weight: '', notes: '' })
    fetchEntries()
  }

  const startEdit = (e: GrowthEntry) => {
    setEditingEntry(e)
    setUnitSystem('metric')
    setFormData({
      recorded_at: e.recorded_at,
      height: e.height_cm ? String(Number(e.height_cm).toFixed(1)) : '',
      weight: e.weight_kg ? String(Number(e.weight_kg).toFixed(1)) : '',
      notes: e.notes || '',
    })
  }

  // Calculate metrics
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const entrySixMonthsAgo = entries.find(e => new Date(e.recorded_at) <= sixMonthsAgo)

  const heightVelocity = latestEntry?.height_cm && entrySixMonthsAgo?.height_cm
    ? Number(latestEntry.height_cm) - Number(entrySixMonthsAgo.height_cm)
    : null
  const weightVelocity = latestEntry?.weight_kg && entrySixMonthsAgo?.weight_kg
    ? Number(latestEntry.weight_kg) - Number(entrySixMonthsAgo.weight_kg)
    : null

  // Simple percentile approximation
  const calcPercentile = (val: number, p50: number, p3: number, p97: number) => {
    if (val <= p3) return 3
    if (val >= p97) return 97
    if (val === p50) return 50
    if (val < p50) return Math.round(3 + ((val - p3) / (p50 - p3)) * 47)
    return Math.round(50 + ((val - p50) / (p97 - p50)) * 47)
  }

  const heightPercentile = latestEntry?.height_cm
    ? calcPercentile(Number(latestEntry.height_cm), 110.2, 102.4, 119.1)
    : null
  const weightPercentile = latestEntry?.weight_kg
    ? calcPercentile(Number(latestEntry.weight_kg), 19.7, 16.3, 25)
    : null

  const bmi = latestEntry?.height_cm && latestEntry?.weight_kg
    ? (Number(latestEntry.weight_kg) / Math.pow(Number(latestEntry.height_cm) / 100, 2))
    : null
  const bmiPercentile = bmi ? calcPercentile(bmi, 15.3, 13.5, 18) : null

  const exportReport = () => {
    const child = selectedChild
    if (!child) return
    const reportWindow = window.open('', '_blank')
    if (!reportWindow) return
    const rows = entries.map(e => `
      <tr>
        <td>${e.recorded_at}</td>
        <td>${e.height_cm ? Number(e.height_cm).toFixed(1) + ' cm' : '—'}</td>
        <td>${e.weight_kg ? Number(e.weight_kg).toFixed(1) + ' kg' : '—'}</td>
        <td>${e.notes || '—'}</td>
      </tr>`).join('')

    reportWindow.document.write(`
      <html><head><title>${t('growthReport')} - ${child.child_name || child.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
        h1 { color: #4f46e5; }
        h2 { color: #64748b; font-size: 16px; margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 12px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .metrics { display: flex; gap: 24px; margin: 16px 0; }
        .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
        .metric .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
        .metric .value { font-size: 24px; font-weight: bold; color: #4f46e5; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>${t('growthReport')}</h1>
      <p><strong>${t('growthReportFor')}:</strong> ${child.child_name || child.name}</p>
      <p><strong>${t('generatedOn')}:</strong> ${new Date().toLocaleDateString()}</p>
      <div class="metrics">
        <div class="metric"><div class="label">${t('heightPercentile')}</div><div class="value">${heightPercentile ?? '—'}</div></div>
        <div class="metric"><div class="label">${t('weightPercentile')}</div><div class="value">${weightPercentile ?? '—'}</div></div>
        <div class="metric"><div class="label">${t('bmiPercentile')}</div><div class="value">${bmiPercentile ?? '—'}</div></div>
        <div class="metric"><div class="label">${t('growthVelocity')}</div><div class="value">${heightVelocity ?? '—'}</div></div>
      </div>
      <h2>${t('heightForAge')} & ${t('weightForAge')}</h2>
      <table>
        <thead><tr><th>${t('measurementDate')}</th><th>${t('height')}</th><th>${t('weight')}</th><th>${t('measurementNotes')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload = () => window.print()</script>
      </body></html>`)
    reportWindow.document.close()
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-extrabold text-xl text-slate-800">{t('growthTracking')}</h2>
        <div className="flex gap-2">
          <button
            onClick={exportReport}
            disabled={entries.length === 0}
            className="bg-white border border-slate-200 text-slate-700 font-display font-bold px-4 py-2 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {t('exportReport')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!selectedChildId}
            className="bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {t('addMeasurement')}
          </button>
        </div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
              className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
                selectedChildId === c.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              {c.child_name || c.name}
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
          <Ruler className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">{t('noMeasurements')}</p>
        </div>
      ) : (
        <>
          {/* Metrics cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="w-4 h-4 text-indigo-500" />
                <p className="text-xs text-slate-400 font-bold uppercase">{t('heightPercentile')}</p>
              </div>
              <p className="font-display font-extrabold text-2xl text-slate-800">
                {heightPercentile != null ? `${heightPercentile}` : '—'}
                <span className="text-sm text-slate-400 ml-1">{t('percentile')}</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Weight className="w-4 h-4 text-teal-500" />
                <p className="text-xs text-slate-400 font-bold uppercase">{t('weightPercentile')}</p>
              </div>
              <p className="font-display font-extrabold text-2xl text-slate-800">
                {weightPercentile != null ? `${weightPercentile}` : '—'}
                <span className="text-sm text-slate-400 ml-1">{t('percentile')}</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Weight className="w-4 h-4 text-fuchsia-500" />
                <p className="text-xs text-slate-400 font-bold uppercase">{t('bmiPercentile')}</p>
              </div>
              <p className="font-display font-extrabold text-2xl text-slate-800">
                {bmiPercentile != null ? `${bmiPercentile}` : '—'}
                <span className="text-sm text-slate-400 ml-1">{t('percentile')}</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-slate-400 font-bold uppercase">{t('growthVelocity')}</p>
              </div>
              <p className="font-display font-extrabold text-2xl text-slate-800">
                {heightVelocity != null ? `+${heightVelocity.toFixed(1)}` : '—'}
                <span className="text-sm text-slate-400 ml-1">{t('cmIn6Months')}</span>
              </p>
            </div>
          </div>

          {/* Chart mode toggle */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setChartMode('percentile')}
              className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
                chartMode === 'percentile' ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" /> {t('heightForAge')}
            </button>
            <button
              onClick={() => setChartMode('scatter')}
              className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
                chartMode === 'scatter' ? 'bg-teal-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <ScatterChart className="w-4 h-4 inline mr-1" /> {t('scatterPlot')}
            </button>
          </div>

          {/* Chart */}
          {chartMode === 'percentile' ? (
            <>
              {/* Metric toggle */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setMetric('height')}
                  className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
                    metric === 'height' ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {t('heightForAge')}
                </button>
                <button
                  onClick={() => setMetric('weight')}
                  className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
                    metric === 'weight' ? 'bg-teal-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {t('weightForAge')}
                </button>
              </div>
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <GrowthChart entries={entries} childAgeYears={childAgeYears} metric={metric} />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 font-semibold mb-2">{t('scatterPlotDesc')}</p>
              <ScatterPlot entries={entries} />
            </div>
          )}

          {/* History table */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-display font-bold text-slate-700 mb-3">{t('measurementDate')}</h3>
            <div className="space-y-2">
              {entries.slice().reverse().map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">{e.recorded_at}</p>
                    <p className="text-xs text-slate-400">
                      {e.height_cm ? `${Number(e.height_cm).toFixed(1)} cm` : '—'}
                      {' · '}
                      {e.weight_kg ? `${Number(e.weight_kg).toFixed(1)} kg` : '—'}
                      {e.notes ? ` · ${e.notes}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(e)}
                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Measurement Modal */}
      {showAddModal && !editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-extrabold text-xl text-slate-800">{t('addMeasurement')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unit toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUnitSystem('metric')}
                className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                  unitSystem === 'metric' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                cm / kg
              </button>
              <button
                onClick={() => setUnitSystem('imperial')}
                className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                  unitSystem === 'imperial' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                in / lbs
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('measurementDate')}</label>
                <input
                  type="date"
                  value={formData.recorded_at}
                  onChange={e => setFormData({ ...formData, recorded_at: e.target.value })}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {unitSystem === 'metric' ? t('heightCm') : t('heightIn')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={e => setFormData({ ...formData, height: e.target.value })}
                  placeholder={unitSystem === 'metric' ? '120.5' : '47.4'}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {unitSystem === 'metric' ? t('weightKg') : t('weightLbs')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={e => setFormData({ ...formData, weight: e.target.value })}
                  placeholder={unitSystem === 'metric' ? '22.5' : '49.6'}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('measurementNotes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('measurementNotes')}
                  rows={2}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!formData.height && !formData.weight}
                className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {t('saveMeasurement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Measurement Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn" onClick={() => { setEditingEntry(null); setFormData({ recorded_at: new Date().toISOString().slice(0, 10), height: '', weight: '', notes: '' }) }}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-extrabold text-xl text-slate-800">{t('editMeasurement')}</h3>
              <button onClick={() => { setEditingEntry(null); setFormData({ recorded_at: new Date().toISOString().slice(0, 10), height: '', weight: '', notes: '' }) }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('measurementDate')}</label>
                <input
                  type="date"
                  value={formData.recorded_at}
                  onChange={e => setFormData({ ...formData, recorded_at: e.target.value })}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('heightCm')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={e => setFormData({ ...formData, height: e.target.value })}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('weightKg')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={e => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('measurementNotes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-100 text-slate-700 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
              <button
                onClick={handleEditSave}
                className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-display font-bold text-lg py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                {t('saveEdit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
