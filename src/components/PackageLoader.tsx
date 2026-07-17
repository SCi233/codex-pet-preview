import { FileArchive, FolderOpen, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useI18n } from '../i18nContext'
import type { LoadedPet } from '../types/pet'

type PackageLoaderProps = {
  pet: LoadedPet | null
  loading: boolean
  onFiles: (files: File[], kind?: LoadedPet['packageKind']) => void
}

export function PackageLoader({ pet, loading, onFiles }: PackageLoaderProps) {
  const { t } = useI18n()
  const filesRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    folderRef.current?.setAttribute('webkitdirectory', '')
    folderRef.current?.setAttribute('directory', '')
  }, [])

  const handleInput = (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: LoadedPet['packageKind'],
  ) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length) onFiles(files, kind)
    event.target.value = ''
  }

  return (
    <section className="package-loader" aria-label={t('loader.aria')}>
      <div className="section-kicker">{t('loader.kicker')}</div>
      <h2>{pet ? t('loader.replace') : t('loader.load')}</h2>
      <p>{t('loader.description')}</p>

      <input
        ref={filesRef}
        className="sr-only"
        type="file"
        multiple
        accept=".zip,.json,.png,.webp,application/zip,application/json,image/png,image/webp"
        aria-label={t('loader.chooseFiles')}
        onChange={(event) => handleInput(event, 'files')}
      />
      <input
        ref={folderRef}
        className="sr-only"
        type="file"
        multiple
        aria-label={t('loader.chooseFolder')}
        onChange={(event) => handleInput(event, 'folder')}
      />

      <div className="loader-actions">
        <button
          className="button primary"
          type="button"
          onClick={() => filesRef.current?.click()}
          disabled={loading}
        >
          {loading ? <RefreshCw className="spin" /> : <FileArchive />}
          {loading ? t('loader.reading') : t('loader.choose')}
        </button>
        <button
          className="button secondary icon-button"
          type="button"
          aria-label={t('loader.chooseFolder')}
          title={t('loader.folderTitle')}
          onClick={() => folderRef.current?.click()}
          disabled={loading}
        >
          <FolderOpen />
        </button>
      </div>

      <div className="drop-hint">
        <Upload />
        <span>{t('loader.dropHint')}</span>
      </div>
    </section>
  )
}
