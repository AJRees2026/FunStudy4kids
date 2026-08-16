import { useMemo } from 'react'
import { useI18n } from '../lib/i18n'
import type { GrowthEntry } from '../lib/supabase'

type Props = {
  entries: GrowthEntry[]
}

// BMI zone boundaries for children (approximate healthy BMI range by height)
// Underweight: BMI < 14, Healthy: 14-18, Overweight: > 18 (simplified for children)
const BMI_UNDER = 14
const BMI_HEALTHY_LOW = 14
const BMI_HEALTHY_HIGH = 18
const BMI_OVER = 18

export default function ScatterPlot({ entries }: Props) {
  const { t } = useI18n()

  const points = useMemo(() => {
    return entries
      .filter(e => e.height_cm != null && e.weight_kg != null)
      .map((e, i) => ({
        x: Number(e.height_cm),
        y: Number(e.weight_kg),
        date: e.recorded_at,
        index: i,
      }))
  }, [entries])

  const width = 520
  const height = 360
  const padding = { top: 20, right: 20, bottom: 50, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const allH = points.map(p => p.x)
  const allW = points.map(p => p.y)

  // Healthy BMI zone lines: weight = BMI * (height_m)^2
  const minH = allH.length > 0 ? Math.floor(Math.min(...allH) * 0.9) : 80
  const maxH = allH.length > 0 ? Math.ceil(Math.max(...allH) * 1.1) : 160
  const minW = allW.length > 0 ? Math.floor(Math.min(...allW) * 0.8) : 10
  const maxW = allW.length > 0 ? Math.ceil(Math.max(...allW) * 1.2) : 40

  const xScale = (h: number) => padding.left + ((h - minH) / (maxH - minH)) * chartW
  const yScale = (w: number) => padding.top + chartH - ((w - minW) / (maxW - minW)) * chartH

  // BMI curve points: for each height value, compute weight at BMI boundaries
  const bmiCurve = (bmi: number) => {
    const pts: { x: number; y: number }[] = []
    for (let h = minH; h <= maxH; h += 2) {
      const w = bmi * Math.pow(h / 100, 2)
      pts.push({ x: xScale(h), y: yScale(w) })
    }
    return pts
  }

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Healthy zone area (between BMI_HEALTHY_LOW and BMI_HEALTHY_HIGH curves)
  const lowCurve = bmiCurve(BMI_HEALTHY_LOW)
  const highCurve = bmiCurve(BMI_HEALTHY_HIGH)
  const healthyAreaPath = useMemo(() => {
    const top = highCurve.map(p => `L ${p.x} ${p.y}`).join(' ')
    const bottom = lowCurve.slice().reverse().map(p => `L ${p.x} ${p.y}`).join(' ')
    return `M ${lowCurve[0].x} ${lowCurve[0].y} ${top} ${bottom} Z`
  }, [lowCurve, highCurve])

  const underCurvePath = toPath(bmiCurve(BMI_UNDER))
  const overCurvePath = toPath(bmiCurve(BMI_OVER))

  // Latest point BMI
  const latestPoint = points.length > 0 ? points[points.length - 1] : null
  const latestBMI = latestPoint ? latestPoint.y / Math.pow(latestPoint.x / 100, 2) : null
  const bmiStatus = latestBMI == null ? null
    : latestBMI < BMI_UNDER ? 'underweight'
    : latestBMI > BMI_OVER ? 'overweight'
    : 'healthyRange'

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]" style={{ maxHeight: '400px' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = padding.top + chartH * f
          const val = maxW - f * (maxW - minW)
          return (
            <g key={f}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(val)}</text>
            </g>
          )
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const x = padding.left + chartW * f
          const val = minH + f * (maxH - minH)
          return (
            <g key={f}>
              <line x1={x} y1={padding.top} x2={x} y2={padding.top + chartH} stroke="#e2e8f0" strokeWidth="1" />
              <text x={x} y={height - padding.bottom + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">{Math.round(val)}</text>
            </g>
          )
        })}

        {/* Healthy BMI zone */}
        {lowCurve.length > 0 && highCurve.length > 0 && (
          <path d={healthyAreaPath} fill="#bbf7d0" opacity="0.4" />
        )}

        {/* BMI boundary lines */}
        <path d={underCurvePath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d={toPath(lowCurve)} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 2" />
        <path d={toPath(highCurve)} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 2" />
        <path d={overCurvePath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />

        {/* BMI labels */}
        <text x={width - padding.right - 4} y={yScale(BMI_OVER * Math.pow(maxH / 100, 2)) - 4} textAnchor="end" fontSize="9" fill="#f59e0b" fontWeight="bold">BMI 18</text>
        <text x={width - padding.right - 4} y={yScale(BMI_UNDER * Math.pow(maxH / 100, 2)) + 12} textAnchor="end" fontSize="9" fill="#f59e0b" fontWeight="bold">BMI 14</text>

        {/* Connecting line between points */}
        {points.length > 1 && (
          <path
            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`).join(' ')}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.5"
            opacity="0.4"
          />
        )}

        {/* Scatter points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={xScale(p.x)}
              cy={yScale(p.y)}
              r={i === points.length - 1 ? 6 : 4}
              fill={i === points.length - 1 ? '#6366f1' : '#818cf8'}
              stroke="white"
              strokeWidth="2"
            />
            {i === points.length - 1 && (
              <>
                <text x={xScale(p.x)} y={yScale(p.y) - 12} textAnchor="middle" fontSize="10" fill="#4f46e5" fontWeight="bold">
                  {p.y.toFixed(1)} kg
                </text>
                <text x={xScale(p.x)} y={yScale(p.y) + 20} textAnchor="middle" fontSize="9" fill="#64748b">
                  {p.date}
                </text>
              </>
            )}
          </g>
        ))}

        {/* Axis labels */}
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="bold">
          {t('height')} ({t('cm')})
        </text>
        <text x={14} y={padding.top + chartH / 2} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="bold"
          transform={`rotate(-90 14 ${padding.top + chartH / 2})`}>
          {t('weight')} ({t('kg')})
        </text>
      </svg>

      {/* Legend + BMI status */}
      <div className="flex flex-wrap gap-3 mt-2 justify-center text-xs items-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-300/50 rounded inline-block"></span> {t('healthyRange')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-amber-500 inline-block rounded" style={{ borderTop: '2px dashed #f59e0b' }}></span> BMI 14 / 18
        </span>
        {latestBMI != null && (
          <span className={`font-bold px-2 py-1 rounded-full ${
            bmiStatus === 'healthyRange' ? 'bg-green-100 text-green-700'
            : bmiStatus === 'overweight' ? 'bg-amber-100 text-amber-700'
            : 'bg-orange-100 text-orange-700'
          }`}>
            {t('bmiStatus')}: {latestBMI.toFixed(1)} ({t(bmiStatus || 'healthyRange')})
          </span>
        )}
      </div>
    </div>
  )
}
