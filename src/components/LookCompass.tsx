import { directionVector } from '../lib/directions'
import type { PointerLook } from '../types/pet'

type LookCompassProps = {
  width: number
  height: number
  deadzone: number
  pointer: PointerLook
}

export function LookCompass({
  width,
  height,
  deadzone,
  pointer,
}: LookCompassProps) {
  const radius = Math.max(72, Math.min(width, height) * 0.34)
  const centerX = width / 2
  const centerY = height / 2

  return (
    <svg
      className="look-compass"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <circle
        className="compass-deadzone"
        cx={centerX}
        cy={centerY}
        r={deadzone}
      />
      <line
        className="compass-axis"
        x1={centerX}
        y1={centerY}
        x2={pointer.x}
        y2={pointer.y}
      />
      {Array.from({ length: 16 }, (_, index) => {
        const vector = directionVector(index, radius)
        return (
          <circle
            key={index}
            className={`compass-tick ${
              pointer.directionIndex === index ? 'is-active' : ''
            } ${index % 4 === 0 ? 'is-cardinal' : ''}`}
            cx={centerX + vector.x}
            cy={centerY + vector.y}
            r={index % 4 === 0 ? 5 : 3}
          />
        )
      })}
      <circle className="compass-center" cx={centerX} cy={centerY} r="4" />
      <circle
        className="compass-pointer"
        cx={pointer.x}
        cy={pointer.y}
        r="7"
      />
    </svg>
  )
}
