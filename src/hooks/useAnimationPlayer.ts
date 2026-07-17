import { useCallback, useEffect, useState } from 'react'
import type { AnimationDefinition } from '../data/animations'

export const useAnimationPlayer = (
  animation: AnimationDefinition,
  speed: number,
  loop: boolean,
) => {
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    setFrame(0)
  }, [animation.id])

  useEffect(() => {
    if (!playing || animation.frames <= 1) return
    const duration = animation.durations[frame] / speed
    const timer = window.setTimeout(() => {
      setFrame((current) => {
        if (current >= animation.frames - 1) {
          if (!loop) {
            setPlaying(false)
            return current
          }
          return 0
        }
        return current + 1
      })
    }, duration)

    return () => window.clearTimeout(timer)
  }, [animation, frame, loop, playing, speed])

  const previous = useCallback(() =>
    setFrame((current) =>
      current === 0 ? animation.frames - 1 : current - 1,
    ), [animation.frames])
  const next = useCallback(() =>
    setFrame((current) =>
      current === animation.frames - 1 ? 0 : current + 1,
    ), [animation.frames])

  return { frame, setFrame, playing, setPlaying, previous, next }
}
