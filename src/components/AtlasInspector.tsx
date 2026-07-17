import { Grid3X3, Image as ImageIcon } from 'lucide-react'
import { useI18n } from '../i18nContext'
import type { LoadedPet } from '../types/pet'

type AtlasInspectorProps = {
  pet: LoadedPet
  showGrid: boolean
  onToggleGrid: () => void
}

export function AtlasInspector({
  pet,
  showGrid,
  onToggleGrid,
}: AtlasInspectorProps) {
  const { t } = useI18n()

  return (
    <div className="atlas-inspector">
      <div className="atlas-toolbar">
        <div>
          <span className="eyebrow">{t('atlas.spritesheet')}</span>
          <strong>
            {pet.width} × {pet.height}
          </strong>
        </div>
        <button
          type="button"
          className={`tool-toggle ${showGrid ? 'is-active' : ''}`}
          onClick={onToggleGrid}
          aria-pressed={showGrid}
        >
          <Grid3X3 /> {t('atlas.cellGrid')}
        </button>
      </div>
      <div className="atlas-scroll">
        <div className="atlas-image-wrap">
          <img
            src={pet.spriteUrl}
            alt={t('atlas.alt', { name: pet.manifest.displayName })}
          />
          {showGrid && (
            <div
              className="atlas-grid"
              style={{
                backgroundSize: `12.5% ${100 / pet.rows}%`,
              }}
            />
          )}
        </div>
      </div>
      <div className="atlas-caption">
        <ImageIcon /> {t('atlas.caption', { rows: pet.rows })}
      </div>
    </div>
  )
}
