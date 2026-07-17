import { LOOK_DIRECTIONS } from '../data/animations'
import type { PointerLook } from '../types/pet'

export const pointerToLook = (
  x: number,
  y: number,
  width: number,
  height: number,
  deadzone: number,
): PointerLook => {
  const dx = x - width / 2
  const dy = y - height / 2
  const radius = Math.hypot(dx, dy)

  if (radius <= deadzone) {
    return {
      x,
      y,
      angle: null,
      directionIndex: null,
      directionLabel: 'Neutral · Idle',
      radius,
    }
  }

  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI
  const normalized = (angle + 360) % 360
  const directionIndex = Math.round(normalized / 22.5) % 16

  return {
    x,
    y,
    angle: normalized,
    directionIndex,
    directionLabel: LOOK_DIRECTIONS[directionIndex],
    radius,
  }
}

export const directionVector = (index: number, radius: number) => {
  const radians = (index * 22.5 * Math.PI) / 180
  return {
    x: Math.sin(radians) * radius,
    y: -Math.cos(radians) * radius,
  }
}
