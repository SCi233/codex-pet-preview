import { Box, Github, Keyboard, Sparkles, UploadCloud, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimationRail } from './components/AnimationRail'
import { InspectorPanel } from './components/InspectorPanel'
import { PackageLoader } from './components/PackageLoader'
import { SpriteStage } from './components/SpriteStage'
import { ANIMATIONS } from './data/animations'
import { useAnimationPlayer } from './hooks/useAnimationPlayer'
import { validatePet } from './lib/atlasValidation'
import { filesFromDataTransfer, loadPetPackage } from './lib/petPackage'
import type {
  LoadedPet,
  PointerLook,
  StageBackground,
  ValidationResult,
} from './types/pet'

const INITIAL_POINTER: PointerLook = {
  x: 0,
  y: 0,
  angle: null,
  directionIndex: null,
  directionLabel: 'Neutral · Idle',
  radius: 0,
}

function App() {
  const [pet, setPet] = useState<LoadedPet | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedAnimationId, setSelectedAnimationId] = useState('idle')
  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState(true)
  const [scale, setScale] = useState(1.35)
  const [pixelated, setPixelated] = useState(false)
  const [guides, setGuides] = useState(false)
  const [lookMode, setLookMode] = useState(false)
  const [deadzone, setDeadzone] = useState(56)
  const [background, setBackground] = useState<StageBackground>('grid')
  const [pointer, setPointer] = useState(INITIAL_POINTER)
  const [inspectorTab, setInspectorTab] = useState<'package' | 'atlas'>('package')
  const [showAtlasGrid, setShowAtlasGrid] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentUrlRef = useRef<string | null>(null)
  const dragDepth = useRef(0)

  const animation = useMemo(
    () =>
      ANIMATIONS.find((item) => item.id === selectedAnimationId) ?? ANIMATIONS[0],
    [selectedAnimationId],
  )
  const {
    frame,
    setFrame,
    playing,
    setPlaying,
    previous,
    next,
  } = useAnimationPlayer(animation, speed, loop)

  const openPet = useCallback(
    async (files: File[], kind: LoadedPet['packageKind'] = 'files') => {
      setLoading(true)
      setError(null)
      try {
        const nextPet = await loadPetPackage(files, kind)
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current)
        currentUrlRef.current = nextPet.spriteUrl
        setPet(nextPet)
        setSelectedAnimationId('idle')
        setFrame(0)
        setPlaying(true)
        setLookMode(false)
        setPointer(INITIAL_POINTER)
        setInspectorTab('package')
        setValidation(null)
        setValidating(true)
        const result = await validatePet(nextPet)
        setValidation(result)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : '无法打开这个 Pet 包。')
      } finally {
        setLoading(false)
        setValidating(false)
      }
    },
    [setFrame, setPlaying],
  )

  useEffect(
    () => () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current)
    },
    [],
  )

  const choosePackage = useCallback(() => inputRef.current?.click(), [])

  const setLookModeSafely = useCallback(
    (enabled: boolean) => {
      if (enabled && pet?.inferredVersion !== 2) return
      setLookMode(enabled)
      if (enabled) {
        setSelectedAnimationId('idle')
        setPlaying(false)
      } else {
        setPlaying(true)
        setPointer((current) => ({
          ...INITIAL_POINTER,
          x: current.x,
          y: current.y,
        }))
      }
    },
    [pet?.inferredVersion, setPlaying],
  )

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, [contenteditable="true"]')) return

      if (event.code === 'Space') {
        event.preventDefault()
        if (!lookMode && pet) setPlaying(!playing)
      } else if (event.key === 'ArrowLeft' && pet && !lookMode) {
        previous()
      } else if (event.key === 'ArrowRight' && pet && !lookMode) {
        next()
      } else if (event.key.toLowerCase() === 'l' && pet?.inferredVersion === 2) {
        setLookModeSafely(!lookMode)
      } else if (event.key.toLowerCase() === 'g') {
        setGuides((current) => !current)
      } else if (/^[1-9]$/.test(event.key)) {
        setSelectedAnimationId(ANIMATIONS[Number(event.key) - 1].id)
        setLookModeSafely(false)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [
    lookMode,
    pet,
    next,
    playing,
    previous,
    setPlaying,
    setLookModeSafely,
  ])

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }
  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = await filesFromDataTransfer(event.dataTransfer)
    if (files.length) void openPet(files, 'folder')
  }

  return (
    <div
      className="app-shell"
      onDragEnter={handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        multiple
        accept=".zip,.json,.png,.webp,application/zip,application/json,image/png,image/webp"
        aria-label="快速选择 Pet 包"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length) void openPet(files)
          event.target.value = ''
        }}
      />

      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Box />
            <Sparkles />
          </span>
          <span>
            <strong>Pet Preview</strong>
            <small>CODEX SPRITE LAB</small>
          </span>
        </div>
        <div className="header-center">
          <span className="privacy-dot" />
          Local-first · No upload
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="header-button"
            onClick={() => setShowShortcuts(!showShortcuts)}
            aria-expanded={showShortcuts}
          >
            <Keyboard /> Shortcuts
          </button>
          <a
            className="header-button"
            href="https://github.com/openai/codex"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <Github />
          </a>
        </div>
      </header>

      {showShortcuts && (
        <div className="shortcut-popover">
          <div className="popover-heading">
            <strong>Keyboard shortcuts</strong>
            <button type="button" onClick={() => setShowShortcuts(false)} aria-label="关闭">
              <X />
            </button>
          </div>
          <dl>
            <div><dt><kbd>1–9</kbd></dt><dd>切换动画</dd></div>
            <div><dt><kbd>Space</kbd></dt><dd>播放 / 暂停</dd></div>
            <div><dt><kbd>← →</kbd></dt><dd>逐帧查看</dd></div>
            <div><dt><kbd>L</kbd></dt><dd>Look 调试</dd></div>
            <div><dt><kbd>G</kbd></dt><dd>辅助线</dd></div>
          </dl>
        </div>
      )}

      <div className="app-layout">
        <aside className="left-sidebar">
          <PackageLoader pet={pet} loading={loading} onFiles={openPet} />
          <AnimationRail
            selectedId={animation.id}
            disabled={!pet}
            onSelect={(id) => {
              setLookModeSafely(false)
              setSelectedAnimationId(id)
              setPlaying(true)
            }}
          />
        </aside>

        <SpriteStage
          pet={pet}
          validation={validation}
          animation={animation}
          frame={frame}
          playing={playing}
          speed={speed}
          loop={loop}
          scale={scale}
          pixelated={pixelated}
          guides={guides}
          lookMode={lookMode}
          deadzone={deadzone}
          background={background}
          pointer={pointer}
          onPointer={setPointer}
          onPlaying={setPlaying}
          onPrevious={previous}
          onNext={next}
          onFrame={setFrame}
          onSpeed={setSpeed}
          onLoop={setLoop}
          onScale={setScale}
          onPixelated={setPixelated}
          onGuides={setGuides}
          onLookMode={setLookModeSafely}
          onDeadzone={setDeadzone}
          onBackground={setBackground}
          onChoosePackage={choosePackage}
        />

        <InspectorPanel
          pet={pet}
          validation={validation}
          validating={validating}
          tab={inspectorTab}
          showAtlasGrid={showAtlasGrid}
          onTab={setInspectorTab}
          onToggleAtlasGrid={() => setShowAtlasGrid(!showAtlasGrid)}
        />
      </div>

      {dragging && (
        <div className="drop-overlay">
          <div>
            <UploadCloud />
            <strong>松手载入 Pet</strong>
            <span>Folder · ZIP · pet.json · PNG / WebP</span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast" role="alert">
          <CircleErrorIcon />
          <span>
            <strong>载入失败</strong>
            <small>{error}</small>
          </span>
          <button type="button" onClick={() => setError(null)} aria-label="关闭错误">
            <X />
          </button>
        </div>
      )}
    </div>
  )
}

function CircleErrorIcon() {
  return <span className="error-symbol">!</span>
}

export default App
