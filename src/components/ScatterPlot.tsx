import { useMemo } from 'react'
import { useI18n } from '../lib/i18n'
import type { GrowthEntry } from '../lib/supabase'

type Props = {
  entries: GrowthEntry[]
}

const BMI_UNDER = 14
const BMI_HEALTHY_LOW = 14
const BMI_HEALTHY_HIGH = 18
const BMI_OVER = 18

const MIN_H = 100
const MAX_H = 180
const MIN_W = 20
const MAX_W = 60

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
  const height = 380
  const padding = { top: 20, right: 20, bottom: 50, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const xScale = (h: number) => padding.left + ((h - MIN_H) / (MAX_H - MIN_H)) * chartW
  const yScale = (w: number) => padding.top + chartH - ((w - MIN_W) / (MAX_W - MIN_W)) * chartH

  const bmiCurve = (bmi: number) => {
    const pts: { x: number; y: number }[] = []
    for (let h = MIN_H; h <= MAX_H; h += 2) {
      const w = bmi * Math.pow(h / 100, 2)
      pts.push({ x: xScale(h), y: yScale(w) })
    }
    return pts
  }

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const lowCurve = bmiCurve(BMI_HEALTHY_LOW)
  const highCurve = bmiCurve(BMI_HEALTHY_HIGH)
  const healthyAreaPath = useMemo(() => {
    const top = highCurve.map(p => `L ${p.x} ${p.y}`).join(' ')
    const bottom = lowCurve.slice().reverse().map(p => `L ${p.x} ${p.y}`).join(' ')
    return `M ${lowCurve[0].x} ${lowCurve[0].y} ${top} ${bottom} Z`
  }, [lowCurve, highCurve])

  const underCurvePath = toPath(bmiCurve(BMI_UNDER))
  const overCurvePath = toPath(bmiCurve(BMI_OVER))

  const latestPoint = points.length > 0 ? points[points.length - 1] : null
  const latestBMI = latestPoint ? latestPoint.y / Math.pow(latestPoint.x / 100, 2) : null
  const bmiStatus = latestBMI == null ? null
    : latestBMI < BMI_UNDER ? 'underweight'
    : latestBMI > BMI_OVER ? 'overweight'
    : 'healthyRange'

  // Height grid: every 3cm from 100 to 180
  const heightGrid: number[] = []
  for (let h = MIN_H; h <= MAX_H; h += 3) heightGrid.push(h)

  // Weight grid: every 5kg from 20 to 60
  const weightGrid: number[] = []
  for (let w = MIN_W; w <= MAX_W; w += 5) weightGrid.push(w)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]" style={{ maxHeight: '420px' }}>
        {/* Horizontal grid lines (weight) */}
        {weightGrid.map((val) => {
          const y = yScale(val)
          return (
            <g key={'w' + val}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val}</text>
            </g>
          )
        })}
        {/* Vertical grid lines (height, every 3cm) */}
        {heightGrid.map((val) => {
          const x = xScale(val)
          return (
            <g key={'h' + val}>
              <line x1={x} y1={padding.top} x2={x} y2={padding.top + chartH} stroke="#e2e8f0" strokeWidth="1" />
              <text x={x} y={height - padding.bottom + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">{val}</text>
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
        <text x={width - padding.right - 4} y={yScale(BMI_OVER * Math.pow(MAX_H / 100, 2)) - 4} textAnchor="end" fontSize="9" fill="#f59e0b" fontWeight="bold">BMI 18</text>
        <text x={width - padding.right - 4} y={yScale(BMI_UNDER * Math.pow(MAX_H / 100, 2)) + 12} textAnchor="end" fontSize="9" fill="#f59e0b" fontWeight="bold">BMI 14</text>

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

        {/* Scatter points — all labeled with weight + date */}
        {points.map((p, i) => {
          const isLatest = i === points.length - 1
          const abovePoint = p.y < (MIN_W + MAX_W) / 2
          const labelY = abovePoint ? yScale(p.y) - 12 : yScale(p.y) + 16
          const dateY = abovePoint ? yScale(p.y) - 24 : yScale(p.y) + 28
          return (
            <g key={i}>
              <circle
                cx={xScale(p.x)}
                cy={yScale(p.y)}
                r={isLatest ? 6 : 4}
                fill={isLatest ? '#6366f1' : '#818cf8'}
                stroke="white"
                strokeWidth="2"
              />
              <text x={xScale(p.x)} y={labelY} textAnchor="middle" fontSize="9" fill={isLatest ? '#4f46e5' : '#64748b'} fontWeight={isLatest ? 'bold' : 'normal'}>
                {p.y.toFixed(1)} kg
              </text>
              <text x={xScale(p.x)} y={dateY} textAnchor="middle" fontSize="8" fill="#94a3b8">
                {p.date}
              </text>
            </g>
          )
        })}

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
