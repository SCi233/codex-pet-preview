import { FileArchive, FolderOpen, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { LoadedPet } from '../types/pet'

type PackageLoaderProps = {
  pet: LoadedPet | null
  loading: boolean
  onFiles: (files: File[], kind?: LoadedPet['packageKind']) => void
}

export function PackageLoader({ pet, loading, onFiles }: PackageLoaderProps) {
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
    <section className="package-loader" aria-label="加载 Pet 包">
      <div className="section-kicker">LOCAL PACKAGE</div>
      <h2>{pet ? '更换 Pet' : '载入 Pet 包'}</h2>
      <p>
        支持文件夹、<code>.zip</code>、<code>pet.json</code> + 图集，或单张
        PNG / WebP atlas。
      </p>

      <input
        ref={filesRef}
        className="sr-only"
        type="file"
        multiple
        accept=".zip,.json,.png,.webp,application/zip,application/json,image/png,image/webp"
        aria-label="选择 Pet 包文件"
        onChange={(event) => handleInput(event, 'files')}
      />
      <input
        ref={folderRef}
        className="sr-only"
        type="file"
        multiple
        aria-label="选择 Pet 包文件夹"
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
          {loading ? '读取中…' : '选择包'}
        </button>
        <button
          className="button secondary icon-button"
          type="button"
          aria-label="选择 Pet 包文件夹"
          title="选择文件夹"
          onClick={() => folderRef.current?.click()}
          disabled={loading}
        >
          <FolderOpen />
        </button>
      </div>

      <div className="drop-hint">
        <Upload />
        <span>也可以把 pet 文件夹或 zip 拖到窗口中</span>
      </div>
    </section>
  )
}
