import { ATLAS_COLUMNS, CELL_HEIGHT, CELL_WIDTH } from '../data/animations'

type SpriteCellProps = {
  spriteUrl: string
  atlasHeight: number
  row: number
  column: number
  scale?: number
  pixelated?: boolean
  label?: string
}

export function SpriteCell({
  spriteUrl,
  atlasHeight,
  row,
  column,
  scale = 1,
  pixelated = false,
  label,
}: SpriteCellProps) {
  return (
    <div
      className="sprite-viewport"
      style={{
        width: CELL_WIDTH * scale,
        height: CELL_HEIGHT * scale,
      }}
      role="img"
      aria-label={label}
    >
      <div
        className={`sprite-cell ${pixelated ? 'is-pixelated' : ''}`}
        style={{
          backgroundImage: `url(${spriteUrl})`,
          backgroundSize: `${CELL_WIDTH * ATLAS_COLUMNS}px ${atlasHeight}px`,
          backgroundPosition: `${-column * CELL_WIDTH}px ${-row * CELL_HEIGHT}px`,
          transform: `scale(${scale})`,
        }}
      />
    </div>
  )
}
