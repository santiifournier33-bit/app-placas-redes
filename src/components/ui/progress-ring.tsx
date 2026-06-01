"use client"

interface ProgressRingProps {
  /** 0–100 completion. */
  percent: number
  /** Ring stroke color (hex). */
  color: string
  size?: number
  strokeWidth?: number
  /** Big centered text, e.g. "24/200" or "0". */
  centerLabel?: string
  /** Small text under the center label, e.g. "Sin meta". */
  centerSubLabel?: string
}

/**
 * SVG circular progress ring. Track + colored arc. Used for funnel KPI cards.
 * No external deps; arc driven by stroke-dasharray.
 */
export function ProgressRing({
  percent,
  color,
  size = 92,
  strokeWidth = 7,
  centerLabel,
  centerSubLabel,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms var(--motion-ease)" }}
        />
      </svg>
      {(centerLabel || centerSubLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
          {centerLabel && (
            <span className="text-sm font-bold text-text-primary tabular-nums">{centerLabel}</span>
          )}
          {centerSubLabel && (
            <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wide">{centerSubLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
