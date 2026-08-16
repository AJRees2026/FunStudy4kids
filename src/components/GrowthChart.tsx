import { useMemo } from 'react'
import { useI18n } from '../lib/i18n'
import type { GrowthEntry } from '../lib/supabase'

// WHO/CDC height-for-age percentile data (boys 2-10 years, cm)
// Approximated from WHO growth standards
const HEIGHT_PERCENTILES_3 = [81, 86.4, 91.3, 95.6, 99.1, 102.4, 105.3, 107.9, 110.3, 112.5, 114.7]
const HEIGHT_PERCENTILES_15 = [83, 88.6, 93.6, 98, 101.7, 105.1, 108.1, 110.8, 113.3, 115.6, 117.9]
const HEIGHT_PERCENTILES_50 = [87, 92.7, 98, 102.7, 106.6, 110.2, 113.4, 116.3, 119, 121.5, 123.8]
const HEIGHT_PERCENTILES_85 = [91, 96.8, 102.4, 107.4, 111.5, 115.3, 118.7, 121.8, 124.6, 127.2, 129.6]
const HEIGHT_PERCENTILES_97 = [94, 100, 105.7, 110.9, 115.2, 119.1, 122.7, 125.9, 128.8, 131.5, 134]

// WHO/CDC weight-for-age percentile data (boys 2-10 years, kg)
const WEIGHT_PERCENTILES_3 = [10.5, 11.8, 13.1, 14.3, 15.3, 16.3, 17.3, 18.3, 19.3, 20.3, 21.3]
const WEIGHT_PERCENTILES_15 = [11.3, 12.7, 14.1, 15.4, 16.5, 17.6, 18.7, 19.8, 20.9, 22, 23.1]
const WEIGHT_PERCENTILES_50 = [12.7, 14.1, 15.7, 17.1, 18.4, 19.7, 21, 22.3, 23.6, 24.9, 26.2]
const WEIGHT_PERCENTILES_85 = [14.2, 15.8, 17.5, 19.2, 20.7, 22.2, 23.7, 25.2, 26.7, 28.2, 29.7]
const WEIGHT_PERCENTILES_97 = [15.9, 17.7, 19.6, 21.5, 23.2, 25, 26.7, 28.4, 30.1, 31.8, 33.5]

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] // years

type Props = {
  entries: GrowthEntry[]
  childAgeYears: number | null
  metric: 'height' | 'weight'
}

export default function GrowthChart({ entries, childAgeYears, metric }: Props) {
  const { t } = useI18n()

  const { p3, p15, p50, p85, p97, unit, childValues, childAges } = useMemo(() => {
    if (metric === 'height') {
      return {
        p3: HEIGHT_PERCENTILES_3,
        p15: HEIGHT_PERCENTILES_15,
        p50: HEIGHT_PERCENTILES_50,
        p85: HEIGHT_PERCENTILES_85,
        p97: HEIGHT_PERCENTILES_97,
        unit: 'cm',
        childValues: entries.filter(e => e.height_cm != null).map(e => Number(e.height_cm)),
        childAges: entries.filter(e => e.height_cm != null).map(e => {
          const d = new Date(e.recorded_at)
          const ageAtMeasurement = childAgeYears != null
            ? childAgeYears - (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
            : null
          return ageAtMeasurement
        }),
      }
    }
    return {
      p3: WEIGHT_PERCENTILES_3,
      p15: WEIGHT_PERCENTILES_15,
      p50: WEIGHT_PERCENTILES_50,
      p85: WEIGHT_PERCENTILES_85,
      p97: WEIGHT_PERCENTILES_97,
      unit: 'kg',
      childValues: entries.filter(e => e.weight_kg != null).map(e => Number(e.weight_kg)),
      childAges: entries.filter(e => e.weight_kg != null).map(e => {
        const d = new Date(e.recorded_at)
        const ageAtMeasurement = childAgeYears != null
          ? childAgeYears - (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
          : null
        return ageAtMeasurement
      }),
    }
  }, [metric, entries, childAgeYears])

  const width = 520
  const height = 320
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const minAge = 2
  const maxAge = 12
  const allValues = [...p3, ...p97, ...childValues]
  const minVal = Math.floor(Math.min(...allValues) * 0.9)
  const maxVal = Math.ceil(Math.max(...allValues) * 1.1)

  const xScale = (age: number) => padding.left + ((age - minAge) / (maxAge - minAge)) * chartW
  const yScale = (val: number) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH

  const toPath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(AGES[i])} ${yScale(v)}`).join(' ')

  const toArea = (lower: number[], upper: number[]) => {
    const top = upper.map((v, i) => `L ${xScale(AGES[i])} ${yScale(v)}`).join(' ')
    const bottom = lower.slice().reverse().map((v, i) => {
      const idx = AGES.length - 1 - i
      return `L ${xScale(AGES[idx])} ${yScale(v)}`
    }).join(' ')
    return `M ${xScale(AGES[0])} ${yScale(lower[0])} ${top} ${bottom} Z`
  }

  const childPoints = childValues.map((v, i) => ({
    x: childAges[i] != null ? xScale(childAges[i]!) : xScale(maxAge),
    y: yScale(v),
    val: v,
    age: childAges[i],
  }))

  const childPath = childPoints.length > 0
    ? childPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : ''

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]" style={{ maxHeight: '360px' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = padding.top + chartH * f
          const val = maxVal - f * (maxVal - minVal)
          return (
            <g key={f}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(val)}</text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {AGES.map((age) => (
          <text key={age} x={xScale(age)} y={height - padding.bottom + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">{age}</text>
        ))}
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="bold">
          {t('measurementDate')} ({t('heightForAge').includes('Age') ? 'years' : 'years'})
        </text>

        {/* Percentile bands */}
        <path d={toArea(p3, p15)} fill="#fef3c7" opacity="0.5" />
        <path d={toArea(p15, p50)} fill="#fde68a" opacity="0.4" />
        <path d={toArea(p50, p85)} fill="#bbf7d0" opacity="0.4" />
        <path d={toArea(p85, p97)} fill="#a7f3d0" opacity="0.4" />

        {/* Percentile lines */}
        <path d={toPath(p3)} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d={toPath(p15)} fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
        <path d={toPath(p50)} fill="none" stroke="#22c55e" strokeWidth="2" />
        <path d={toPath(p85)} fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
        <path d={toPath(p97)} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" />

        {/* Percentile labels */}
        <text x={width - padding.right - 4} y={yScale(p97[p97.length - 1]) - 4} textAnchor="end" fontSize="9" fill="#f59e0b" fontWeight="bold">97th</text>
        <text x={width - padding.right - 4} y={yScale(p50[p50.length - 1]) - 4} textAnchor="end" fontSize="9" fill="#22c55e" fontWeight="bold">50th</text>
        <text x={width - padding.right - 4} y={yScale(p3[p3.length - 1]) + 12} textAnchor="end" fontSize="9" fill="#f59e0b" fontWeight="bold">3rd</text>

        {/* Child's data line */}
        {childPath && <path d={childPath} fill="none" stroke="#6366f1" strokeWidth="2.5" />}

        {/* Child's data points */}
        {childPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#6366f1" stroke="white" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#4f46e5" fontWeight="bold">{p.val}</text>
          </g>
        ))}

        {/* Y-axis label */}
        <text x={14} y={padding.top + chartH / 2} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="bold"
          transform={`rotate(-90 14 ${padding.top + chartH / 2})`}>
          {metric === 'height' ? t('height') : t('weight')} ({unit})
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 justify-center text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block rounded"></span> {t('heightForAge')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block rounded"></span> 50th</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block rounded" style={{borderTop: '2px dashed'}}></span> 3rd / 97th</span>
      </div>
    </div>
  )
}
