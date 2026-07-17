import { unzipSync } from 'fflate'
import type { LoadedPet, PetManifest } from '../types/pet'

type PackageFile = {
  path: string
  file: File
}

const normalizePath = (value: string) =>
  value.replaceAll('\\', '/').replace(/^\.?\//, '').replace(/\/{2,}/g, '/')

const dirname = (value: string) => {
  const normalized = normalizePath(value)
  const index = normalized.lastIndexOf('/')
  return index === -1 ? '' : normalized.slice(0, index)
}

const joinPath = (...parts: string[]) =>
  normalizePath(parts.filter(Boolean).join('/')).replace(/(^|\/)\.\//g, '$1')

const mimeForPath = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase()
  if (extension === 'json') return 'application/json'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

const isSpriteImage = (path: string) => /\.(png|webp)$/i.test(path)

const imageDimensions = async (file: File) => {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dimensions
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () =>
        resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('浏览器无法读取 spritesheet 图像。'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

const filesFromZip = async (zipFile: File): Promise<PackageFile[]> => {
  let entries: ReturnType<typeof unzipSync>
  try {
    entries = unzipSync(new Uint8Array(await zipFile.arrayBuffer()))
  } catch {
    throw new Error('ZIP 解压失败，请确认文件没有加密且内容完整。')
  }

  return Object.entries(entries)
    .filter(([path]) => !path.endsWith('/'))
    .map(([path, bytes]) => {
      const normalized = normalizePath(path)
      return {
        path: normalized,
        file: new File([bytes], normalized.split('/').at(-1) ?? 'file', {
          type: mimeForPath(normalized),
        }),
      }
    })
}

const packageFilesFromFiles = (files: File[]): PackageFile[] =>
  files.map((file) => ({
    path: normalizePath(file.webkitRelativePath || file.name),
    file,
  }))

const validateManifestShape = (value: unknown): PetManifest => {
  if (!value || typeof value !== 'object') {
    throw new Error('pet.json 不是有效的 JSON 对象。')
  }

  const candidate = value as Partial<PetManifest>
  if (!candidate.id || typeof candidate.id !== 'string') {
    throw new Error('pet.json 缺少字符串字段 id。')
  }
  if (!candidate.displayName || typeof candidate.displayName !== 'string') {
    throw new Error('pet.json 缺少字符串字段 displayName。')
  }
  if (!candidate.spritesheetPath || typeof candidate.spritesheetPath !== 'string') {
    throw new Error('pet.json 缺少字符串字段 spritesheetPath。')
  }

  return candidate as PetManifest
}

export const loadPetPackage = async (
  inputFiles: File[],
  sourceKind: LoadedPet['packageKind'] = 'files',
): Promise<LoadedPet> => {
  if (inputFiles.length === 0) throw new Error('没有收到任何文件。')

  const zip = inputFiles.find((file) => file.name.toLowerCase().endsWith('.zip'))
  const packageFiles = zip
    ? await filesFromZip(zip)
    : packageFilesFromFiles(inputFiles)
  const effectiveKind = zip ? 'zip' : sourceKind

  const manifestEntry = packageFiles
    .filter(({ path }) => path.toLowerCase().endsWith('pet.json'))
    .sort((a, b) => a.path.length - b.path.length)[0]

  let manifest: PetManifest
  let spriteEntry: PackageFile | undefined
  let manifestSource = '自动推断（未提供 pet.json）'

  if (manifestEntry) {
    let parsed: unknown
    try {
      parsed = JSON.parse(await manifestEntry.file.text())
    } catch {
      throw new Error('pet.json 无法解析，请检查 JSON 语法。')
    }
    manifest = validateManifestShape(parsed)
    manifestSource = manifestEntry.path

    const expectedPath = joinPath(dirname(manifestEntry.path), manifest.spritesheetPath)
    spriteEntry = packageFiles.find(({ path }) => normalizePath(path) === expectedPath)

    if (!spriteEntry) {
      const expectedBasename = normalizePath(manifest.spritesheetPath).split('/').at(-1)
      spriteEntry = packageFiles.find(
        ({ path }) => path.split('/').at(-1) === expectedBasename,
      )
    }
  } else {
    spriteEntry = packageFiles.find(({ path }) => isSpriteImage(path))
    if (!spriteEntry) {
      throw new Error('包中没有找到 pet.json 或 PNG/WebP spritesheet。')
    }
    const fallbackId = spriteEntry.file.name.replace(/\.[^.]+$/, '') || 'local-pet'
    manifest = {
      id: fallbackId,
      displayName: fallbackId,
      description: 'Raw atlas preview',
      spritesheetPath: spriteEntry.file.name,
    }
  }

  if (!spriteEntry || !isSpriteImage(spriteEntry.path)) {
    throw new Error(`找不到 pet.json 指向的 spritesheet：${manifest.spritesheetPath}`)
  }

  const { width, height } = await imageDimensions(spriteEntry.file)
  const rows = height / 208
  const inferredVersion =
    width === 1536 && height === 2288
      ? 2
      : width === 1536 && height === 1872
        ? 1
        : 'unknown'

  return {
    manifest,
    manifestSource,
    spriteSource: spriteEntry.path,
    spriteFile: spriteEntry.file,
    spriteUrl: URL.createObjectURL(spriteEntry.file),
    width,
    height,
    rows,
    inferredVersion,
    packageKind: manifestEntry ? effectiveKind : 'atlas',
  }
}

const readAllDirectoryEntries = async (
  directory: FileSystemDirectoryEntry,
): Promise<FileSystemEntry[]> => {
  const reader = directory.createReader()
  const entries: FileSystemEntry[] = []

  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    )
    if (batch.length === 0) return entries
    entries.push(...batch)
  }
}

const readEntry = async (entry: FileSystemEntry): Promise<File[]> => {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    )
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: normalizePath(entry.fullPath),
    })
    return [file]
  }

  if (entry.isDirectory) {
    const entries = await readAllDirectoryEntries(
      entry as FileSystemDirectoryEntry,
    )
    return (await Promise.all(entries.map(readEntry))).flat()
  }

  return []
}

export const filesFromDataTransfer = async (dataTransfer: DataTransfer) => {
  const entries = Array.from(dataTransfer.items)
    .map((item) => {
      const candidate = item as DataTransferItem & {
        webkitGetAsEntry?: () => FileSystemEntry | null
      }
      return candidate.webkitGetAsEntry?.() ?? null
    })
    .filter((entry): entry is FileSystemEntry => Boolean(entry))

  if (entries.length > 0) {
    return (await Promise.all(entries.map(readEntry))).flat()
  }

  return Array.from(dataTransfer.files)
}
