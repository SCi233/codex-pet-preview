import {
  AlertTriangle,
  Check,
  CircleAlert,
  FileJson,
  Image,
  PackageCheck,
} from 'lucide-react'
import { useI18n } from '../i18nContext'
import type { LoadedPet, ValidationResult } from '../types/pet'
import { AtlasInspector } from './AtlasInspector'

type InspectorPanelProps = {
  pet: LoadedPet | null
  validation: ValidationResult | null
  validating: boolean
  tab: 'package' | 'atlas'
  showAtlasGrid: boolean
  onTab: (tab: 'package' | 'atlas') => void
  onToggleAtlasGrid: () => void
}

const DiagnosticIcon = ({ level }: { level: 'pass' | 'warning' | 'error' }) => {
  if (level === 'pass') return <Check />
  if (level === 'warning') return <AlertTriangle />
  return <CircleAlert />
}

export function InspectorPanel({
  pet,
  validation,
  validating,
  tab,
  showAtlasGrid,
  onTab,
  onToggleAtlasGrid,
}: InspectorPanelProps) {
  const { t } = useI18n()

  return (
    <aside className="inspector-panel">
      <div className="inspector-tabs" role="tablist" aria-label={t('inspector.aria')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'package'}
          className={tab === 'package' ? 'is-active' : ''}
          onClick={() => onTab('package')}
        >
          {t('inspector.package')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'atlas'}
          className={tab === 'atlas' ? 'is-active' : ''}
          onClick={() => onTab('atlas')}
          disabled={!pet}
        >
          {t('inspector.atlas')}
        </button>
      </div>

      {tab === 'atlas' && pet ? (
        <AtlasInspector
          pet={pet}
          showGrid={showAtlasGrid}
          onToggleGrid={onToggleAtlasGrid}
        />
      ) : (
        <div className="inspector-content">
          {!pet ? (
            <div className="inspector-empty">
              <PackageCheck />
              <h3>{t('inspector.waiting')}</h3>
              <p>{t('inspector.waitingDescription')}</p>
            </div>
          ) : (
            <>
              <section className="pet-summary">
                <div className="pet-monogram">
                  {pet.manifest.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="eyebrow">{t('inspector.currentPet')}</span>
                  <h2>{pet.manifest.displayName}</h2>
                  <code>{pet.manifest.id}</code>
                </div>
              </section>

              {pet.manifest.description && (
                <p className="pet-description">{pet.manifest.description}</p>
              )}

              <section className="file-facts">
                <div>
                  <FileJson />
                  <span>
                    <small>{t('inspector.manifest')}</small>
                    <strong>
                      {pet.manifestSource ?? t('package.autoInferred')}
                    </strong>
                  </span>
                </div>
                <div>
                  <Image />
                  <span>
                    <small>{t('inspector.spritesheet')}</small>
                    <strong>{pet.spriteSource}</strong>
                  </span>
                </div>
              </section>

              <section className="validation-section">
                <div className="validation-heading">
                  <div>
                    <span className="eyebrow">{t('inspector.packageCheck')}</span>
                    <h3>{t('inspector.diagnostics')}</h3>
                  </div>
                  {validating ? (
                    <span className="status-chip is-loading">
                      {t('inspector.scanning')}
                    </span>
                  ) : validation ? (
                    <span
                      className={`status-chip ${
                        validation.isValid ? 'is-valid' : 'is-invalid'
                      }`}
                    >
                      {validation.isValid
                        ? t('inspector.ready')
                        : t('inspector.issues')}
                    </span>
                  ) : null}
                </div>
                <div className="diagnostic-list">
                  {validation?.diagnostics.map((diagnostic) => (
                    <div
                      key={diagnostic.id}
                      className={`diagnostic-item is-${diagnostic.level}`}
                    >
                      <span className="diagnostic-icon">
                        <DiagnosticIcon level={diagnostic.level} />
                      </span>
                      <span>
                        <strong>{diagnostic.label}</strong>
                        <small>{diagnostic.detail}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
