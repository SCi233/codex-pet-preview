import { Grid3X3, Image as ImageIcon } from 'lucide-react'
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
  return (
    <div className="atlas-inspector">
      <div className="atlas-toolbar">
        <div>
          <span className="eyebrow">SPRITESHEET</span>
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
          <Grid3X3 /> Cell grid
        </button>
      </div>
      <div className="atlas-scroll">
        <div className="atlas-image-wrap">
          <img src={pet.spriteUrl} alt={`${pet.manifest.displayName} spritesheet`} />
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
        <ImageIcon /> 每格 192 × 208 · {pet.rows} rows · 8 columns
      </div>
    </div>
  )
}
