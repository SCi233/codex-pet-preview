import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  Grid2X2,
  MousePointer2,
  PackageOpen,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AnimationDefinition } from '../data/animations'
import { directionToCell, LOOK_DIRECTIONS } from '../data/animations'
import { useI18n } from '../i18nContext'
import { pointerToLook } from '../lib/directions'
import type {
  LoadedPet,
  PointerLook,
  StageBackground,
  ValidationResult,
} from '../types/pet'
import { LookCompass } from './LookCompass'
import { SpriteCell } from './SpriteCell'

type SpriteStageProps = {
  pet: LoadedPet | null
  validation: ValidationResult | null
  animation: AnimationDefinition
  frame: number
  playing: boolean
  speed: number
  loop: boolean
  scale: number
  pixelated: boolean
  guides: boolean
  lookMode: boolean
  deadzone: number
  background: StageBackground
  pointer: PointerLook
  onPointer: (pointer: PointerLook) => void
  onPlaying: (playing: boolean) => void
  onPrevious: () => void
  onNext: () => void
  onFrame: (frame: number) => void
  onSpeed: (speed: number) => void
  onLoop: (loop: boolean) => void
  onScale: (scale: number) => void
  onPixelated: (pixelated: boolean) => void
  onGuides: (guides: boolean) => void
  onLookMode: (lookMode: boolean) => void
  onDeadzone: (deadzone: number) => void
  onBackground: (background: StageBackground) => void
  onChoosePackage: () => void
}

const EMPTY_LOOK: PointerLook = {
  x: 0,
  y: 0,
  angle: null,
  directionIndex: null,
  radius: 0,
}

export function SpriteStage({
  pet,
  validation,
  animation,
  frame,
  playing,
  speed,
  loop,
  scale,
  pixelated,
  guides,
  lookMode,
  deadzone,
  background,
  pointer,
  onPointer,
  onPlaying,
  onPrevious,
  onNext,
  onFrame,
  onSpeed,
  onLoop,
  onScale,
  onPixelated,
  onGuides,
  onLookMode,
  onDeadzone,
  onBackground,
  onChoosePackage,
}: SpriteStageProps) {
  const { locale, t } = useI18n()
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 720, height: 560 })
  const supportsLook = pet?.inferredVersion === 2

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setStageSize({ width, height })
    })
    resizeObserver.observe(stage)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (pointer.x !== 0 || pointer.y !== 0) return
    onPointer({
      ...EMPTY_LOOK,
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    })
  }, [onPointer, pointer.x, pointer.y, stageSize.height, stageSize.width])

  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!lookMode || !supportsLook) return
    const rect = event.currentTarget.getBoundingClientRect()
    onPointer(
      pointerToLook(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
        deadzone,
      ),
    )
  }

  const handlePointerLeave = () => {
    if (!lookMode) return
    onPointer({
      ...EMPTY_LOOK,
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    })
  }

  const lookCell =
    lookMode && pointer.directionIndex !== null
      ? directionToCell(pointer.directionIndex)
      : null
  const activeRow = lookCell?.row ?? animation.row
  const activeColumn = lookCell?.column ?? frame
  const animationLabel = animation.label[locale]
  const directionLabel =
    pointer.directionIndex === null
      ? t('stage.neutralIdle')
      : LOOK_DIRECTIONS[pointer.directionIndex][locale]
  const activeLabel = lookCell
    ? t('stage.lookDirection', { direction: directionLabel })
    : t('stage.animationFrame', {
        animation: animationLabel,
        frame: frame + 1,
      })

  return (
    <main className="preview-workspace">
      <div className="preview-header">
        <div>
          <span className="eyebrow">{t('stage.livePreview')}</span>
          <h1>{pet ? pet.manifest.displayName : 'Codex Pet Preview'}</h1>
        </div>
        <div className="preview-statuses">
          {pet && (
            <span
              className={`contract-badge ${
                pet.inferredVersion === 2 ? 'is-v2' : 'is-v1'
              }`}
            >
              {pet.inferredVersion === 2 ? 'V2 · 16 LOOK' : 'V1 · 9 ROWS'}
            </span>
          )}
          {validation && (
            <span
              className={`ready-badge ${validation.isValid ? 'is-ready' : 'has-issues'}`}
            >
              {validation.isValid ? <Check /> : <ScanLine />}
              {validation.isValid
                ? t('stage.packageReady')
                : t('stage.checkPackage')}
            </span>
          )}
        </div>
      </div>

      <section
        ref={stageRef}
        className={`preview-stage bg-${background} ${
          lookMode ? 'is-look-mode' : ''
        }`}
        aria-label={t('stage.aria')}
        onPointerMove={handlePointer}
        onPointerLeave={handlePointerLeave}
      >
        {!pet ? (
          <div className="stage-empty">
            <div className="empty-orbit" aria-hidden="true">
              <div className="empty-pet-face">
                <span />
                <span />
                <i />
              </div>
            </div>
            <div className="stage-empty-copy">
              <span className="eyebrow">{t('stage.dropKicker')}</span>
              <h2>{t('stage.emptyTitle')}</h2>
              <p>{t('stage.emptyDescription')}</p>
              <button className="button primary" type="button" onClick={onChoosePackage}>
                <PackageOpen /> {t('stage.choosePackage')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="stage-topline">
              <span>
                ROW {String(activeRow).padStart(2, '0')} / CELL{' '}
                {String(activeColumn).padStart(2, '0')}
              </span>
              <span>{activeLabel}</span>
            </div>

            {lookMode && supportsLook && (
              <LookCompass
                width={stageSize.width}
                height={stageSize.height}
                deadzone={deadzone}
                pointer={pointer}
              />
            )}

            <div className="sprite-stage-center">
              <div className={`sprite-frame ${guides ? 'show-guides' : ''}`}>
                <SpriteCell
                  spriteUrl={pet.spriteUrl}
                  atlasHeight={pet.height}
                  row={activeRow}
                  column={activeColumn}
                  scale={scale}
                  pixelated={pixelated}
                  label={activeLabel}
                />
                {guides && (
                  <div className="sprite-guide" aria-hidden="true">
                    <span className="guide-origin" />
                    <span className="guide-baseline" />
                  </div>
                )}
              </div>
            </div>

            {lookMode && (
              <div className="look-readout">
                <MousePointer2 />
                <span>
                  <small>{t('stage.direction')}</small>
                  <strong>{directionLabel}</strong>
                </span>
                <span>
                  <small>{t('stage.rawAngle')}</small>
                  <strong>
                    {pointer.angle === null
                      ? t('stage.deadzone')
                      : `${pointer.angle.toFixed(1)}°`}
                  </strong>
                </span>
              </div>
            )}
          </>
        )}
      </section>

      <section className="control-deck" aria-label={t('stage.controls')}>
        <div className="transport-controls">
          <button
            type="button"
            className="control-button"
            onClick={onPrevious}
            disabled={!pet || lookMode}
            aria-label={t('stage.previousFrame')}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="play-button"
            onClick={() => onPlaying(!playing)}
            disabled={!pet || lookMode}
            aria-label={playing ? t('stage.pause') : t('stage.play')}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button
            type="button"
            className="control-button"
            onClick={onNext}
            disabled={!pet || lookMode}
            aria-label={t('stage.nextFrame')}
          >
            <ChevronRight />
          </button>
        </div>

        <div className="frame-scrubber">
          <div className="scrubber-meta">
            <span>
              {lookMode ? t('stage.pointerControlled') : animationLabel}
            </span>
            <strong>
              {lookMode ? directionLabel : `${frame + 1} / ${animation.frames}`}
            </strong>
          </div>
          <div className="frame-dots" aria-label={t('stage.framePicker')}>
            {Array.from({ length: animation.frames }, (_, index) => (
              <button
                key={index}
                type="button"
                className={frame === index ? 'is-active' : ''}
                onClick={() => onFrame(index)}
                disabled={!pet || lookMode}
                aria-label={t('stage.frame', { frame: index + 1 })}
              />
            ))}
          </div>
        </div>

        <div className="quick-controls">
          <label className="speed-control">
            <span>{t('stage.speed')}</span>
            <select
              value={speed}
              onChange={(event) => onSpeed(Number(event.target.value))}
              disabled={!pet || lookMode}
            >
              <option value={0.25}>0.25×</option>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2×</option>
              <option value={3}>3×</option>
            </select>
          </label>
          <button
            type="button"
            className={`tool-toggle ${loop ? 'is-active' : ''}`}
            onClick={() => onLoop(!loop)}
            aria-pressed={loop}
            disabled={!pet || lookMode}
          >
            <RotateCcw /> {t('stage.loop')}
          </button>
        </div>
      </section>

      <section className="settings-strip" aria-label={t('stage.settings')}>
        <div className="setting-group scale-setting">
          <span className="setting-label">{t('stage.scale')}</span>
          <input
            type="range"
            min="0.5"
            max="2.4"
            step="0.1"
            value={scale}
            onChange={(event) => onScale(Number(event.target.value))}
            disabled={!pet}
            aria-label={t('stage.petScale')}
          />
          <output>{scale.toFixed(1)}×</output>
        </div>

        <div className="setting-group background-setting">
          <span className="setting-label">{t('stage.stage')}</span>
          {(['grid', 'dark', 'light', 'chroma'] as StageBackground[]).map((value) => (
            <button
              key={value}
              type="button"
              className={`background-swatch is-${value} ${
                background === value ? 'is-active' : ''
              }`}
              onClick={() => onBackground(value)}
              aria-label={t('stage.background', { background: value })}
              aria-pressed={background === value}
            />
          ))}
        </div>

        <div className="setting-group view-toggles">
          <button
            type="button"
            className={`tool-toggle ${pixelated ? 'is-active' : ''}`}
            onClick={() => onPixelated(!pixelated)}
            aria-pressed={pixelated}
            disabled={!pet}
          >
            <Grid2X2 /> {t('stage.pixel')}
          </button>
          <button
            type="button"
            className={`tool-toggle ${guides ? 'is-active' : ''}`}
            onClick={() => onGuides(!guides)}
            aria-pressed={guides}
            disabled={!pet}
          >
            <Crosshair /> {t('stage.guides')}
          </button>
          <button
            type="button"
            className={`tool-toggle look-toggle ${lookMode ? 'is-active' : ''}`}
            onClick={() => onLookMode(!lookMode)}
            aria-pressed={lookMode}
            disabled={!pet || !supportsLook}
            title={
              supportsLook
                ? t('stage.lookSupported')
                : t('stage.lookUnsupported')
            }
          >
            <Eye /> {t('stage.look')}
          </button>
        </div>

        {lookMode && supportsLook && (
          <div className="setting-group deadzone-setting">
            <span className="setting-label">{t('stage.deadzone')}</span>
            <input
              type="range"
              min="12"
              max="120"
              step="2"
              value={deadzone}
              onChange={(event) => onDeadzone(Number(event.target.value))}
              aria-label={t('stage.lookDeadzone')}
            />
            <output>{deadzone}px</output>
          </div>
        )}
      </section>
    </main>
  )
}
