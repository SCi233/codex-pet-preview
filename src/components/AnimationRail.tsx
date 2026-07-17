import { ANIMATIONS } from '../data/animations'

type AnimationRailProps = {
  selectedId: string
  disabled: boolean
  onSelect: (id: string) => void
}

export function AnimationRail({
  selectedId,
  disabled,
  onSelect,
}: AnimationRailProps) {
  return (
    <nav className="animation-rail" aria-label="动画列表">
      <div className="rail-heading">
        <span>Animations</span>
        <span className="rail-count">09</span>
      </div>
      <div className="animation-list">
        {ANIMATIONS.map((animation) => {
          const Icon = animation.icon
          return (
            <button
              type="button"
              key={animation.id}
              className={`animation-item ${
                selectedId === animation.id ? 'is-active' : ''
              }`}
              onClick={() => onSelect(animation.id)}
              disabled={disabled}
              aria-pressed={selectedId === animation.id}
            >
              <span className="animation-icon">
                <Icon />
              </span>
              <span className="animation-copy">
                <strong>{animation.shortLabel}</strong>
                <small>{animation.id}</small>
              </span>
              <kbd>{animation.shortcut}</kbd>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
