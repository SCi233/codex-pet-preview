import {
  Box,
  ChevronDown,
  Gamepad2,
  Github,
  Keyboard,
  Languages,
  Moon,
  PanelsTopLeft,
  Sparkles,
  Sun,
  UploadCloud,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimationRail } from './components/AnimationRail'
import { InspectorPanel } from './components/InspectorPanel'
import { PackageLoader } from './components/PackageLoader'
import { Playground } from './components/Playground'
import { SpriteStage } from './components/SpriteStage'
import { ANIMATIONS } from './data/animations'
import { useAnimationPlayer } from './hooks/useAnimationPlayer'
import { useI18n } from './i18nContext'
import { validatePet } from './lib/atlasValidation'
import { filesFromDataTransfer, loadPetPackage } from './lib/petPackage'
import { useTheme, type ThemePreference } from './themeContext'
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
  radius: 0,
}

function App() {
  const { locale, setLocale, t } = useI18n()
  const { preference, resolvedTheme, setPreference } = useTheme()
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
  const [workspaceMode, setWorkspaceMode] =
    useState<'preview' | 'playground'>('preview')
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
        const nextPet = await loadPetPackage(files, kind, locale)
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
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : t('app.unknownLoadError'),
        )
      } finally {
        setLoading(false)
      }
    },
    [locale, setFrame, setPlaying, t],
  )

  useEffect(() => {
    if (!pet) {
      setValidation(null)
      setValidating(false)
      return
    }

    let cancelled = false
    setValidating(true)
    void validatePet(pet, locale)
      .then((result) => {
        if (!cancelled) setValidation(result)
      })
      .finally(() => {
        if (!cancelled) setValidating(false)
      })

    return () => {
      cancelled = true
    }
  }, [locale, pet])

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
      if (workspaceMode !== 'preview') return
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
    workspaceMode,
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
        aria-label={t('app.quickPackage')}
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
          {t('app.privacy')}
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="header-button workspace-toggle"
            onClick={() =>
              setWorkspaceMode((current) =>
                current === 'preview' ? 'playground' : 'preview',
              )
            }
            aria-label={
              workspaceMode === 'preview'
                ? t('app.openPlayground')
                : t('app.openPreview')
            }
            title={
              workspaceMode === 'preview'
                ? t('app.openPlayground')
                : t('app.openPreview')
            }
          >
            {workspaceMode === 'preview' ? <Gamepad2 /> : <PanelsTopLeft />}
            <span>
              {workspaceMode === 'preview'
                ? t('app.playground')
                : t('app.preview')}
            </span>
          </button>
          <button
            type="button"
            className="header-button"
            onClick={() => setShowShortcuts(!showShortcuts)}
            aria-expanded={showShortcuts}
          >
            <Keyboard /> <span>{t('app.shortcuts')}</span>
          </button>
          <label className="theme-control" title={t('theme.label')}>
            {resolvedTheme === 'dark' ? <Moon /> : <Sun />}
            <span className="sr-only">{t('theme.label')}</span>
            <select
              value={preference}
              aria-label={t('theme.label')}
              onChange={(event) =>
                setPreference(event.target.value as ThemePreference)
              }
            >
              <option value="system">{t('theme.system')}</option>
              <option value="dark">{t('theme.dark')}</option>
              <option value="light">{t('theme.light')}</option>
            </select>
            <ChevronDown className="theme-chevron" />
          </label>
          <button
            type="button"
            className="header-button language-toggle"
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            aria-label={
              locale === 'zh'
                ? t('app.switchToEnglish')
                : t('app.switchToChinese')
            }
            title={
              locale === 'zh'
                ? t('app.switchToEnglish')
                : t('app.switchToChinese')
            }
          >
            <Languages /> <span>{locale === 'zh' ? 'EN' : '中文'}</span>
          </button>
          <a
            className="header-button"
            href="https://github.com/SCi233/codex-pet-preview"
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
            <strong>{t('app.shortcutHeading')}</strong>
            <button
              type="button"
              onClick={() => setShowShortcuts(false)}
              aria-label={t('app.close')}
            >
              <X />
            </button>
          </div>
          <dl>
            <div><dt><kbd>1–9</kbd></dt><dd>{t('app.shortcutAnimations')}</dd></div>
            <div><dt><kbd>Space</kbd></dt><dd>{t('app.shortcutPlay')}</dd></div>
            <div><dt><kbd>← →</kbd></dt><dd>{t('app.shortcutFrames')}</dd></div>
            <div><dt><kbd>L</kbd></dt><dd>{t('app.shortcutLook')}</dd></div>
            <div><dt><kbd>G</kbd></dt><dd>{t('app.shortcutGuides')}</dd></div>
          </dl>
        </div>
      )}

      <div
        className={`app-layout ${
          workspaceMode === 'playground' ? 'is-playground' : ''
        }`}
      >
        <aside className="left-sidebar">
          <PackageLoader pet={pet} loading={loading} onFiles={openPet} />
          {workspaceMode === 'preview' && (
            <AnimationRail
              selectedId={animation.id}
              disabled={!pet}
              onSelect={(id) => {
                setLookModeSafely(false)
                setSelectedAnimationId(id)
                setPlaying(true)
              }}
            />
          )}
        </aside>

        {workspaceMode === 'preview' ? (
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
        ) : (
          <Playground
            pet={pet}
            onChoosePackage={choosePackage}
            onError={setError}
          />
        )}

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
            <strong>{t('app.dropTitle')}</strong>
            <span>Folder · ZIP · pet.json · PNG / WebP</span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast" role="alert">
          <CircleErrorIcon />
          <span>
            <strong>{t('app.loadFailed')}</strong>
            <small>{error}</small>
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label={t('app.closeError')}
          >
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
