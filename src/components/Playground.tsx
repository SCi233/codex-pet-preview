import {
  CircleStop,
  Crop,
  Download,
  ImagePlus,
  Maximize2,
  Minus,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react'
import { applyPalette, GIFEncoder, quantize } from 'gifenc'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ANIMATIONS,
  CELL_HEIGHT,
  CELL_WIDTH,
  type AnimationDefinition,
} from '../data/animations'
import { useI18n } from '../i18nContext'
import type { LoadedPet } from '../types/pet'

type PlaygroundProps = {
  pet: LoadedPet | null
  onChoosePackage: () => void
  onError: (message: string) => void
}

type Position = { x: number; y: number }
type CanvasSize = { width: number; height: number }
type BackgroundCrop = { zoom: number; x: number; y: number }
type BackgroundMode = 'color' | 'transparent'
type SequenceMode = 'playback' | 'video' | 'gif' | null
type AspectPresetId = '16:9' | '4:3' | '3:2' | '1:1' | '9:16' | 'custom'
type TooltipAlign = 'start' | 'center' | 'end'
type RGBColor = { r: number; g: number; b: number }
type RGBChannel = keyof RGBColor

const REFERENCE_SIZE: CanvasSize = { width: 960, height: 540 }
const INITIAL_POSITION: Position = { x: 0.5, y: 0.62 }
const INITIAL_CROP: BackgroundCrop = { zoom: 1, x: 50, y: 50 }
const CODEX_DEFAULT_PET_WIDTH = 112
const DEFAULT_PET_SCALE = CODEX_DEFAULT_PET_WIDTH / CELL_WIDTH
const GIF_LONG_EDGE = 480
const MAX_PREVIEW_PIXEL_RATIO = 2

const ASPECT_PRESETS: Array<{
  id: Exclude<AspectPresetId, 'custom'>
  ratio: number
}> = [
  { id: '16:9', ratio: 16 / 9 },
  { id: '4:3', ratio: 4 / 3 },
  { id: '3:2', ratio: 3 / 2 },
  { id: '1:1', ratio: 1 },
  { id: '9:16', ratio: 9 / 16 },
]

const COMMON_COLORS = [
  '#24231f',
  '#000000',
  '#404040',
  '#737373',
  '#a3a3a3',
  '#d4d4d4',
  '#ffffff',
  '#f5f1e8',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
]

function ControlTooltip({
  children,
  label,
  align = 'center',
  hidden = false,
}: {
  children: ReactNode
  label: string
  align?: TooltipAlign
  hidden?: boolean
}) {
  return (
    <span
      className={`control-tooltip is-${align} ${hidden ? 'is-hidden' : ''}`}
      data-tooltip={label}
    >
      {children}
    </span>
  )
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image-load-failed'))
    image.src = url
  })

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration))

const safeFilename = (value: string) =>
  value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'pet'

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const hexToRgb = (hex: string): RGBColor => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
})

const rgbToHex = ({ r, g, b }: RGBColor) =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const petDimensions = (petScale: number) => ({
  width: CELL_WIDTH * petScale,
  height: CELL_HEIGHT * petScale,
})

const clampPosition = (
  position: Position,
  size: CanvasSize,
  petScale: number,
): Position => {
  const dimensions = petDimensions(petScale)
  const halfWidth = Math.min(0.49, dimensions.width / size.width / 2)
  const halfHeight = Math.min(0.49, dimensions.height / size.height / 2)
  return {
    x: clamp(position.x, halfWidth, 1 - halfWidth),
    y: clamp(position.y, halfHeight, 1 - halfHeight),
  }
}

const drawCheckerboard = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const cell = Math.max(12, Math.round(Math.min(width, height) / 24))
  context.fillStyle = '#e9e7df'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#c9c6bc'
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      if ((x / cell + y / cell) % 2 === 0) context.fillRect(x, y, cell, cell)
    }
  }
}

const drawCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  crop: BackgroundCrop,
) => {
  const scale =
    Math.max(width / image.naturalWidth, height / image.naturalHeight) * crop.zoom
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  const overflowX = Math.max(0, drawWidth - width)
  const overflowY = Math.max(0, drawHeight - height)
  context.drawImage(
    image,
    -overflowX * (crop.x / 100),
    -overflowY * (crop.y / 100),
    drawWidth,
    drawHeight,
  )
}

const drawScene = ({
  canvas,
  sprite,
  backgroundImage,
  backgroundColor,
  backgroundMode,
  backgroundCrop,
  position,
  petScale,
  animation,
  frame,
  logicalSize = { width: canvas.width, height: canvas.height },
  showTransparencyGrid = true,
}: {
  canvas: HTMLCanvasElement
  sprite: HTMLImageElement
  backgroundImage: HTMLImageElement | null
  backgroundColor: string
  backgroundMode: BackgroundMode
  backgroundCrop: BackgroundCrop
  position: Position
  petScale: number
  animation: AnimationDefinition
  frame: number
  logicalSize?: CanvasSize
  showTransparencyGrid?: boolean
}) => {
  const context = canvas.getContext('2d')
  if (!context) return

  const outputScaleX = canvas.width / logicalSize.width
  const outputScaleY = canvas.height / logicalSize.height
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  context.setTransform(outputScaleX, 0, 0, outputScaleY, 0, 0)
  if (backgroundMode === 'transparent' && showTransparencyGrid) {
    drawCheckerboard(context, logicalSize.width, logicalSize.height)
  } else {
    if (backgroundMode === 'color') {
      context.fillStyle = backgroundColor
      context.fillRect(0, 0, logicalSize.width, logicalSize.height)
    }
  }
  if (backgroundImage) {
    drawCover(
      context,
      backgroundImage,
      logicalSize.width,
      logicalSize.height,
      backgroundCrop,
    )
  }

  const dimensions = petDimensions(petScale)
  const x = position.x * logicalSize.width - dimensions.width / 2
  const y = position.y * logicalSize.height - dimensions.height / 2
  const shouldSmooth =
    dimensions.width * outputScaleX < CELL_WIDTH ||
    dimensions.height * outputScaleY < CELL_HEIGHT
  context.imageSmoothingEnabled = shouldSmooth
  if (shouldSmooth) context.imageSmoothingQuality = 'high'
  const drawX = shouldSmooth ? x : Math.round(x * outputScaleX) / outputScaleX
  const drawY = shouldSmooth ? y : Math.round(y * outputScaleY) / outputScaleY
  context.drawImage(
    sprite,
    frame * CELL_WIDTH,
    animation.row * CELL_HEIGHT,
    CELL_WIDTH,
    CELL_HEIGHT,
    drawX,
    drawY,
    dimensions.width,
    dimensions.height,
  )
  context.restore()
}

const gifSizeFor = (size: CanvasSize): CanvasSize => {
  if (size.width >= size.height) {
    return {
      width: GIF_LONG_EDGE,
      height: Math.max(2, Math.round((GIF_LONG_EDGE * size.height) / size.width)),
    }
  }
  return {
    width: Math.max(2, Math.round((GIF_LONG_EDGE * size.width) / size.height)),
    height: GIF_LONG_EDGE,
  }
}

const sequenceFrames = ANIMATIONS.flatMap((animation) =>
  Array.from({ length: animation.frames }, (_, frame) => ({
    animation,
    frame,
    duration: animation.durations[frame],
  })),
)

export function Playground({ pet, onChoosePackage, onError }: PlaygroundProps) {
  const { locale, t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const colorPopoverRef = useRef<HTMLDivElement>(null)
  const sequenceRunRef = useRef(0)
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 })
  const lastPointerXRef = useRef(0)
  const backgroundUrlRef = useRef<string | null>(null)
  const [spriteImage, setSpriteImage] = useState<HTMLImageElement | null>(null)
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [backgroundImageName, setBackgroundImageName] = useState<string | null>(null)
  const [backgroundColor, setBackgroundColor] = useState('#24231f')
  const [hexInput, setHexInput] = useState('#24231f')
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('color')
  const [backgroundCrop, setBackgroundCrop] =
    useState<BackgroundCrop>(INITIAL_CROP)
  const [showCropControls, setShowCropControls] = useState(false)
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false)
  const [aspectPreset, setAspectPreset] = useState<AspectPresetId>('16:9')
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(REFERENCE_SIZE)
  const [previewPixelRatio] = useState(() =>
    Math.min(window.devicePixelRatio || 1, MAX_PREVIEW_PIXEL_RATIO),
  )
  const [petScale, setPetScale] = useState(DEFAULT_PET_SCALE)
  const [position, setPosition] = useState<Position>(INITIAL_POSITION)
  const [animationId, setAnimationId] = useState('idle')
  const [frame, setFrame] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [sequenceMode, setSequenceMode] = useState<SequenceMode>(null)
  const [sequenceProgress, setSequenceProgress] = useState(0)

  const animation = useMemo(
    () => ANIMATIONS.find((candidate) => candidate.id === animationId) ?? ANIMATIONS[0],
    [animationId],
  )

  const triggerAnimation = useCallback((id: string) => {
    setAnimationId(id)
    setFrame(0)
  }, [])

  useEffect(() => {
    sequenceRunRef.current += 1
    setSequenceMode(null)
    setSequenceProgress(0)
    setPosition(INITIAL_POSITION)
    setPetScale(DEFAULT_PET_SCALE)
    triggerAnimation('idle')
    setSpriteImage(null)
    if (!pet) return
    let cancelled = false
    void loadImage(pet.spriteUrl)
      .then((image) => {
        if (!cancelled) setSpriteImage(image)
      })
      .catch(() => {
        if (!cancelled) onError(t('playground.spriteLoadError'))
      })
    return () => {
      cancelled = true
    }
  }, [onError, pet, t, triggerAnimation])

  useEffect(() => {
    setPosition((current) => clampPosition(current, canvasSize, petScale))
  }, [canvasSize, petScale])

  useEffect(() => {
    if (!spriteImage || sequenceMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    drawScene({
      canvas,
      sprite: spriteImage,
      backgroundImage,
      backgroundColor,
      backgroundMode,
      backgroundCrop,
      position,
      petScale,
      animation,
      frame,
      logicalSize: canvasSize,
    })
  }, [
    animation,
    backgroundColor,
    backgroundCrop,
    backgroundImage,
    backgroundMode,
    canvasSize,
    frame,
    petScale,
    position,
    sequenceMode,
    spriteImage,
  ])

  useEffect(() => {
    if (!pet || sequenceMode) return
    const duration = animation.durations[frame]
    const timer = window.setTimeout(() => {
      if (frame < animation.frames - 1) {
        setFrame(frame + 1)
        return
      }

      const shouldLoop =
        animation.id === 'idle' ||
        (hovering && animation.id === 'jumping') ||
        (dragging && animation.id.startsWith('running-'))
      if (shouldLoop) {
        setFrame(0)
      } else {
        triggerAnimation('idle')
      }
    }, duration)
    return () => window.clearTimeout(timer)
  }, [animation, dragging, frame, hovering, pet, sequenceMode, triggerAnimation])

  useEffect(() => {
    if (!colorPopoverOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!colorPopoverRef.current?.contains(event.target as Node)) {
        setColorPopoverOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [colorPopoverOpen])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key === 'Escape' && colorPopoverOpen) {
        setColorPopoverOpen(false)
        return
      }
      if (target?.matches('input, select, textarea, [contenteditable="true"]')) return
      if (/^[1-9]$/.test(event.key) && pet && !sequenceMode) {
        triggerAnimation(ANIMATIONS[Number(event.key) - 1].id)
      } else if (event.key === 'Escape') {
        sequenceRunRef.current += 1
        setSequenceMode(null)
        setSequenceProgress(0)
        setPosition(INITIAL_POSITION)
        triggerAnimation('idle')
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [colorPopoverOpen, pet, sequenceMode, triggerAnimation])

  useEffect(
    () => () => {
      sequenceRunRef.current += 1
      if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current)
    },
    [],
  )

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvasSize.width,
      y: ((event.clientY - rect.top) / rect.height) * canvasSize.height,
    }
  }

  const hitsPet = (point: Position) => {
    const dimensions = petDimensions(petScale)
    const petX = position.x * canvasSize.width
    const petY = position.y * canvasSize.height
    return (
      point.x >= petX - dimensions.width / 2 &&
      point.x <= petX + dimensions.width / 2 &&
      point.y >= petY - dimensions.height / 2 &&
      point.y <= petY + dimensions.height / 2
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pet || sequenceMode) return
    const point = canvasPoint(event)
    if (!hitsPet(point)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragOffsetRef.current = {
      x: point.x - position.x * canvasSize.width,
      y: point.y - position.y * canvasSize.height,
    }
    lastPointerXRef.current = point.x
    setDragging(true)
    setHovering(false)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pet || sequenceMode) return
    const point = canvasPoint(event)
    if (!dragging) {
      const isHovering = hitsPet(point)
      if (isHovering !== hovering) {
        setHovering(isHovering)
        triggerAnimation(isHovering ? 'jumping' : 'idle')
      }
      return
    }

    const nextPosition = clampPosition(
      {
        x: (point.x - dragOffsetRef.current.x) / canvasSize.width,
        y: (point.y - dragOffsetRef.current.y) / canvasSize.height,
      },
      canvasSize,
      petScale,
    )
    setPosition(nextPosition)

    const deltaX = point.x - lastPointerXRef.current
    if (Math.abs(deltaX) > 1.5) {
      const nextAnimation = deltaX > 0 ? 'running-right' : 'running-left'
      if (animationId !== nextAnimation) triggerAnimation(nextAnimation)
    }
    lastPointerXRef.current = point.x
  }

  const finishDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
    setHovering(false)
    triggerAnimation('idle')
  }

  const handleBackgroundFile = async (file: File | undefined) => {
    if (!file) return
    const nextUrl = URL.createObjectURL(file)
    try {
      const image = await loadImage(nextUrl)
      if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current)
      backgroundUrlRef.current = nextUrl
      setBackgroundImage(image)
      setBackgroundImageName(file.name)
      setBackgroundCrop(INITIAL_CROP)
      setShowCropControls(true)
    } catch {
      URL.revokeObjectURL(nextUrl)
      onError(t('playground.backgroundLoadError'))
    }
  }

  const clearBackgroundImage = () => {
    if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current)
    backgroundUrlRef.current = null
    setBackgroundImage(null)
    setBackgroundImageName(null)
    setShowCropControls(false)
  }

  const applyColor = (color: string) => {
    setBackgroundColor(color)
    setHexInput(color)
    setBackgroundMode('color')
  }

  const rgbColor = useMemo(() => hexToRgb(backgroundColor), [backgroundColor])

  const handleHexChange = (value: string) => {
    const nextValue = value.startsWith('#') ? value : `#${value}`
    if (!/^#[0-9a-fA-F]{0,6}$/.test(nextValue)) return
    setHexInput(nextValue)
    if (/^#[0-9a-fA-F]{6}$/.test(nextValue)) applyColor(nextValue.toLowerCase())
  }

  const handleRgbChange = (channel: RGBChannel, value: string) => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return
    applyColor(
      rgbToHex({
        ...rgbColor,
        [channel]: clamp(numericValue, 0, 255),
      }),
    )
  }

  const resetPetTransform = () => {
    setPosition(INITIAL_POSITION)
    setPetScale(DEFAULT_PET_SCALE)
  }

  const handleAspectPreset = (id: AspectPresetId) => {
    setAspectPreset(id)
    const preset = ASPECT_PRESETS.find((candidate) => candidate.id === id)
    if (preset) {
      setCanvasSize((current) => ({
        width: clamp(Math.round(current.height * preset.ratio), 240, 1920),
        height: current.height,
      }))
    }
  }

  const stopSequence = () => {
    sequenceRunRef.current += 1
    setSequenceMode(null)
    setSequenceProgress(0)
    triggerAnimation('idle')
  }

  const selectVideoMime = (requiresAlpha: boolean) => {
    if (typeof MediaRecorder === 'undefined') return null
    const candidates = requiresAlpha
      ? [
          'video/webm;codecs=vp8',
          'video/webm;codecs=vp9',
          'video/webm',
        ]
      : [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
        ]
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? null
  }

  const runSequence = async (mode: Exclude<SequenceMode, null>) => {
    if (!pet || !spriteImage || sequenceMode) return
    const canvas = canvasRef.current
    if (!canvas) return

    const runId = sequenceRunRef.current + 1
    sequenceRunRef.current = runId
    setSequenceMode(mode)
    setSequenceProgress(0)
    setColorPopoverOpen(false)
    let recorder: MediaRecorder | null = null
    let videoStream: MediaStream | null = null
    let videoCanvas: HTMLCanvasElement | null = null
    let recordedChunks: Blob[] = []
    let videoFinished: Promise<Blob> | null = null
    let gif: ReturnType<typeof GIFEncoder> | null = null
    let gifCanvas: HTMLCanvasElement | null = null
    let gifSize: CanvasSize | null = null

    try {
      if (mode === 'video') {
        videoCanvas = document.createElement('canvas')
        videoCanvas.width = canvasSize.width
        videoCanvas.height = canvasSize.height
        if (!('captureStream' in videoCanvas)) {
          throw new Error(t('playground.videoUnsupported'))
        }
        const requiresAlpha = backgroundMode === 'transparent'
        const mimeType = selectVideoMime(requiresAlpha)
        if (mimeType === null) {
          throw new Error(
            requiresAlpha
              ? t('playground.transparentVideoUnsupported')
              : t('playground.videoUnsupported'),
          )
        }
        videoStream = videoCanvas.captureStream(30)
        recorder = new MediaRecorder(videoStream, { mimeType })
        recordedChunks = []
        videoFinished = new Promise((resolve) => {
          recorder!.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data)
          }
          recorder!.onstop = () =>
            resolve(new Blob(recordedChunks, { type: recorder!.mimeType || 'video/webm' }))
        })
        recorder.start()
      } else if (mode === 'gif') {
        gif = GIFEncoder()
        gifSize = gifSizeFor(canvasSize)
        gifCanvas = document.createElement('canvas')
        gifCanvas.width = gifSize.width
        gifCanvas.height = gifSize.height
      }

      for (let index = 0; index < sequenceFrames.length; index += 1) {
        if (sequenceRunRef.current !== runId) break
        const item = sequenceFrames[index]
        setAnimationId(item.animation.id)
        setFrame(item.frame)
        setSequenceProgress((index + 1) / sequenceFrames.length)

        const scene = {
          sprite: spriteImage,
          backgroundImage,
          backgroundColor,
          backgroundMode,
          backgroundCrop,
          position,
          petScale,
          animation: item.animation,
          frame: item.frame,
        }
        drawScene({
          canvas,
          ...scene,
          logicalSize: canvasSize,
          showTransparencyGrid: true,
        })

        if (videoCanvas) {
          drawScene({
            canvas: videoCanvas,
            ...scene,
            logicalSize: canvasSize,
            showTransparencyGrid: false,
          })
        }

        if (gif && gifCanvas && gifSize) {
          drawScene({
            canvas: gifCanvas,
            ...scene,
            logicalSize: canvasSize,
            showTransparencyGrid: false,
          })
          const context = gifCanvas.getContext('2d', { willReadFrequently: true })
          if (!context) throw new Error(t('playground.gifFailed'))
          const pixels = context.getImageData(0, 0, gifSize.width, gifSize.height).data
          const transparent = backgroundMode === 'transparent'
          const paletteFormat = transparent ? 'rgba4444' : 'rgb444'
          const palette = quantize(pixels, 128, {
            format: paletteFormat,
            oneBitAlpha: transparent,
          })
          const indexed = applyPalette(pixels, palette, paletteFormat)
          const transparentIndex = transparent
            ? palette.findIndex((color) => color[3] === 0)
            : -1
          gif.writeFrame(indexed, gifSize.width, gifSize.height, {
            palette,
            delay: item.duration,
            repeat: 0,
            transparent: transparentIndex >= 0,
            transparentIndex: Math.max(0, transparentIndex),
            dispose: transparentIndex >= 0 ? 2 : undefined,
          })
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        } else {
          await wait(item.duration)
        }
      }

      if (recorder && recorder.state !== 'inactive') {
        recorder.stop()
        const blob = await videoFinished!
        if (sequenceRunRef.current === runId) {
          const extension = blob.type.startsWith('video/mp4') ? 'mp4' : 'webm'
          downloadBlob(
            blob,
            `${safeFilename(pet.manifest.id)}-animations.${extension}`,
          )
        }
      } else if (gif && sequenceRunRef.current === runId) {
        gif.finish()
        downloadBlob(
          new Blob([gif.bytes()], { type: 'image/gif' }),
          `${safeFilename(pet.manifest.id)}-animations.gif`,
        )
      }
    } catch (reason) {
      if (recorder?.state === 'recording') recorder.stop()
      onError(reason instanceof Error ? reason.message : t('playground.recordingFailed'))
    } finally {
      videoStream?.getTracks().forEach((track) => track.stop())
      if (sequenceRunRef.current === runId) {
        setSequenceMode(null)
        setSequenceProgress(0)
        triggerAnimation('idle')
      }
    }
  }

  const sequenceLabel =
    sequenceMode === 'playback'
      ? t('playground.playingAll')
      : sequenceMode === 'gif'
        ? t('playground.encodingGif')
        : t('playground.recordingVideo')

  return (
    <main className="playground-workspace">
      <div className="playground-heading">
        <div>
          <span className="eyebrow">{t('playground.kicker')}</span>
          <h1>{t('playground.title')}</h1>
          <p>{t('playground.description')}</p>
        </div>
        <div className="playground-status">
          <Sparkles />
          <span>{animation.label[locale]}</span>
          <kbd>{animation.shortcut}</kbd>
        </div>
      </div>

      <section
        className={`playground-stage ${canvasSize.height > canvasSize.width ? 'is-portrait' : ''}`}
        style={{
          aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
          width: `min(100%, calc(var(--playground-stage-height) * ${canvasSize.width / canvasSize.height}))`,
        }}
        aria-label={t('playground.stage')}
      >
        <canvas
          ref={canvasRef}
          width={Math.round(canvasSize.width * previewPixelRatio)}
          height={Math.round(canvasSize.height * previewPixelRatio)}
          className={`${hovering ? 'is-hovering' : ''} ${dragging ? 'is-dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onPointerLeave={(event) => {
            if (dragging) return
            setHovering(false)
            triggerAnimation('idle')
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
        />

        {!pet && (
          <div className="playground-empty">
            <Sparkles />
            <strong>{t('playground.emptyTitle')}</strong>
            <span>{t('playground.emptyDescription')}</span>
            <button type="button" className="button primary" onClick={onChoosePackage}>
              {t('stage.choosePackage')}
            </button>
          </div>
        )}
      </section>

      <section className="playground-toolbar" aria-label={t('playground.controls')}>
        <div className="playground-settings">
          <div className="playground-range-control">
            <span className="control-label">{t('playground.petScale')}</span>
            <ControlTooltip label={t('playground.decreasePetScale')} align="start">
              <button
                type="button"
                className="scale-step"
                onClick={() => setPetScale((current) => clamp(current - 0.1, 0.5, 4))}
                disabled={!pet || Boolean(sequenceMode)}
                aria-label={t('playground.decreasePetScale')}
              >
                <Minus />
              </button>
            </ControlTooltip>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.01"
              value={petScale}
              onChange={(event) => setPetScale(Number(event.target.value))}
              disabled={!pet || Boolean(sequenceMode)}
              aria-label={t('playground.petScale')}
            />
            <ControlTooltip label={t('playground.increasePetScale')}>
              <button
                type="button"
                className="scale-step"
                onClick={() => setPetScale((current) => clamp(current + 0.1, 0.5, 4))}
                disabled={!pet || Boolean(sequenceMode)}
                aria-label={t('playground.increasePetScale')}
              >
                <Plus />
              </button>
            </ControlTooltip>
            <input
              className="scale-value"
              type="number"
              min="0.5"
              max="4"
              step="0.01"
              value={Number(petScale.toFixed(2))}
              onChange={(event) =>
                setPetScale(clamp(Number(event.target.value), 0.5, 4))
              }
              disabled={!pet || Boolean(sequenceMode)}
              aria-label={t('playground.petScaleValue')}
            />
          </div>

          <label className="aspect-control">
            <Maximize2 />
            <span className="control-label">{t('playground.aspectRatio')}</span>
            <select
              value={aspectPreset}
              onChange={(event) => handleAspectPreset(event.target.value as AspectPresetId)}
              disabled={Boolean(sequenceMode)}
              aria-label={t('playground.aspectRatio')}
            >
              {ASPECT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.id}</option>
              ))}
              <option value="custom">{t('playground.customSize')}</option>
            </select>
          </label>

          {aspectPreset === 'custom' && (
            <div className="custom-size-control">
              <label>
                <span>{t('playground.width')}</span>
                <input
                  type="number"
                  min="240"
                  max="1920"
                  value={canvasSize.width}
                  onChange={(event) =>
                    setCanvasSize((current) => ({
                      ...current,
                      width: clamp(Number(event.target.value), 240, 1920),
                    }))
                  }
                />
              </label>
              <span>×</span>
              <label>
                <span>{t('playground.height')}</span>
                <input
                  type="number"
                  min="240"
                  max="1920"
                  value={canvasSize.height}
                  onChange={(event) =>
                    setCanvasSize((current) => ({
                      ...current,
                      height: clamp(Number(event.target.value), 240, 1920),
                    }))
                  }
                />
              </label>
            </div>
          )}

          <ControlTooltip label={t('playground.resetPosition')}>
            <button
              type="button"
              className="tool-toggle"
              onClick={resetPetTransform}
              disabled={!pet || Boolean(sequenceMode)}
              aria-label={t('playground.resetPosition')}
            >
              <RotateCcw />
              <span className="tool-label">{t('playground.resetPosition')}</span>
            </button>
          </ControlTooltip>
        </div>

        <div className="playground-background-controls">
          <div className="color-popover-wrap" ref={colorPopoverRef}>
            <ControlTooltip
              label={t('playground.backgroundColor')}
              hidden={colorPopoverOpen}
            >
              <button
                type="button"
                className={`tool-toggle color-popover-trigger ${colorPopoverOpen ? 'is-active' : ''}`}
                onClick={() => setColorPopoverOpen((current) => !current)}
                disabled={Boolean(sequenceMode)}
                aria-expanded={colorPopoverOpen}
                aria-controls="playground-color-popover"
                aria-label={t('playground.backgroundColor')}
              >
                <span
                  className={`background-button-swatch ${backgroundMode === 'transparent' ? 'is-transparent' : ''}`}
                  style={backgroundMode === 'color' ? { backgroundColor } : undefined}
                />
                <Palette />
                <span className="tool-label">{t('playground.backgroundColor')}</span>
              </button>
            </ControlTooltip>

            {colorPopoverOpen && (
              <div
                id="playground-color-popover"
                className="color-popover"
                role="dialog"
                aria-label={t('playground.commonColors')}
              >
                <div className="color-presets" aria-label={t('playground.commonColors')}>
                  <ControlTooltip label={t('playground.transparent')} align="start">
                    <button
                      type="button"
                      className={`background-preset is-transparent ${backgroundMode === 'transparent' ? 'is-active' : ''}`}
                      onClick={() => setBackgroundMode('transparent')}
                      aria-label={t('playground.transparent')}
                    />
                  </ControlTooltip>
                  {COMMON_COLORS.map((color, index) => (
                    <ControlTooltip
                      key={color}
                      label={t('playground.colorPreset', { color })}
                      align={
                        (index + 1) % 6 === 0
                          ? 'start'
                          : (index + 1) % 6 === 5
                            ? 'end'
                            : 'center'
                      }
                    >
                      <button
                        type="button"
                        className={`background-preset ${backgroundMode === 'color' && backgroundColor === color ? 'is-active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => applyColor(color)}
                        aria-label={t('playground.colorPreset', { color })}
                      />
                    </ControlTooltip>
                  ))}
                </div>

                <div className="color-fields">
                  <label className="color-control">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(event) => applyColor(event.target.value)}
                      aria-label={t('playground.colorPicker')}
                    />
                    <span>HEX</span>
                    <input
                      className="hex-input"
                      type="text"
                      value={hexInput}
                      onChange={(event) => handleHexChange(event.target.value)}
                      onBlur={() => setHexInput(backgroundColor)}
                      aria-label={t('playground.hexColor')}
                      spellCheck={false}
                    />
                  </label>

                  <div
                    className="rgb-control"
                    role="group"
                    aria-label={t('playground.rgbColor')}
                  >
                    {(['r', 'g', 'b'] as const).map((channel) => (
                      <label key={channel}>
                        <span>{channel.toUpperCase()}</span>
                        <input
                          type="number"
                          min="0"
                          max="255"
                          value={rgbColor[channel]}
                          onChange={(event) => handleRgbChange(channel, event.target.value)}
                          aria-label={`${channel.toUpperCase()} ${t('playground.rgbChannel')}`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <input
            ref={backgroundInputRef}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label={t('playground.backgroundImage')}
            onChange={(event) => {
              void handleBackgroundFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <ControlTooltip label={t('playground.addBackground')}>
            <button
              type="button"
              className="tool-toggle"
              onClick={() => backgroundInputRef.current?.click()}
              disabled={Boolean(sequenceMode)}
              aria-label={t('playground.addBackground')}
            >
              <ImagePlus />
              <span className="tool-label">
                {backgroundImageName ?? t('playground.addBackground')}
              </span>
            </button>
          </ControlTooltip>
          {backgroundImage && (
            <>
              <ControlTooltip label={t('playground.cropBackground')}>
                <button
                  type="button"
                  className={`tool-toggle ${showCropControls ? 'is-active' : ''}`}
                  onClick={() => setShowCropControls((current) => !current)}
                  disabled={Boolean(sequenceMode)}
                  aria-label={t('playground.cropBackground')}
                >
                  <Crop />
                  <span className="tool-label">{t('playground.cropBackground')}</span>
                </button>
              </ControlTooltip>
              <ControlTooltip label={t('playground.removeBackground')}>
                <button
                  type="button"
                  className="control-button"
                  onClick={clearBackgroundImage}
                  disabled={Boolean(sequenceMode)}
                  aria-label={t('playground.removeBackground')}
                >
                  <Trash2 />
                </button>
              </ControlTooltip>
            </>
          )}
        </div>

        <div className="recording-controls">
          {sequenceMode ? (
            <div className="sequence-status" aria-live="polite">
              <span>{sequenceLabel}</span>
              <div><i style={{ width: `${sequenceProgress * 100}%` }} /></div>
              <strong>{Math.round(sequenceProgress * 100)}%</strong>
              <button type="button" className="button secondary" onClick={stopSequence}>
                <CircleStop /> {t('playground.stop')}
              </button>
            </div>
          ) : (
            <>
              <ControlTooltip label={t('playground.playAll')}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void runSequence('playback')}
                  disabled={!pet || !spriteImage}
                  aria-label={t('playground.playAll')}
                >
                  <Play /> <span className="tool-label">{t('playground.playAll')}</span>
                </button>
              </ControlTooltip>
              <ControlTooltip label={t('playground.exportVideo')}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void runSequence('video')}
                  disabled={!pet || !spriteImage}
                  aria-label={t('playground.exportVideo')}
                >
                  <Video />
                  <span className="tool-label">{t('playground.exportVideo')}</span>
                </button>
              </ControlTooltip>
              <ControlTooltip label={t('playground.exportGif')}>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => void runSequence('gif')}
                  disabled={!pet || !spriteImage}
                  aria-label={t('playground.exportGif')}
                >
                  <Download />
                  <span className="tool-label">{t('playground.exportGif')}</span>
                </button>
              </ControlTooltip>
            </>
          )}
        </div>
      </section>

      {backgroundImage && showCropControls && (
        <section className="background-crop-panel" aria-label={t('playground.cropBackground')}>
          <div className="crop-heading">
            <div>
              <strong>{t('playground.cropBackground')}</strong>
              <span>{t('playground.cropHint')}</span>
            </div>
            <button
              type="button"
              className="tool-toggle"
              onClick={() => setBackgroundCrop(INITIAL_CROP)}
            >
              <RotateCcw /> {t('playground.resetCrop')}
            </button>
          </div>
          <label className="crop-slider">
            <span>{t('playground.cropZoom')}</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={backgroundCrop.zoom}
              onChange={(event) =>
                setBackgroundCrop((current) => ({
                  ...current,
                  zoom: Number(event.target.value),
                }))
              }
            />
            <output>{backgroundCrop.zoom.toFixed(2)}×</output>
          </label>
          <label className="crop-slider">
            <span>{t('playground.cropHorizontal')}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={backgroundCrop.x}
              onChange={(event) =>
                setBackgroundCrop((current) => ({
                  ...current,
                  x: Number(event.target.value),
                }))
              }
            />
            <output>{backgroundCrop.x}%</output>
          </label>
          <label className="crop-slider">
            <span>{t('playground.cropVertical')}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={backgroundCrop.y}
              onChange={(event) =>
                setBackgroundCrop((current) => ({
                  ...current,
                  y: Number(event.target.value),
                }))
              }
            />
            <output>{backgroundCrop.y}%</output>
          </label>
        </section>
      )}

      <section className="playground-animations" aria-label={t('playground.animations')}>
        {ANIMATIONS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={animationId === item.id ? 'is-active' : ''}
              onClick={() => triggerAnimation(item.id)}
              disabled={!pet || Boolean(sequenceMode)}
              aria-pressed={animationId === item.id}
            >
              <Icon />
              <span>{item.shortLabel[locale]}</span>
              <kbd>{item.shortcut}</kbd>
            </button>
          )
        })}
      </section>
    </main>
  )
}
