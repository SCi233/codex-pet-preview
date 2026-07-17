export type PetManifest = {
  id: string
  displayName: string
  description?: string
  spriteVersionNumber?: number
  spritesheetPath: string
  kind?: string
  [key: string]: unknown
}

export type LoadedPet = {
  manifest: PetManifest
  manifestSource: string | null
  spriteSource: string
  spriteFile: File
  spriteUrl: string
  width: number
  height: number
  rows: number
  inferredVersion: 1 | 2 | 'unknown'
  packageKind: 'zip' | 'folder' | 'files' | 'atlas'
}

export type DiagnosticLevel = 'pass' | 'warning' | 'error'

export type Diagnostic = {
  id: string
  label: string
  detail: string
  level: DiagnosticLevel
}

export type ValidationResult = {
  diagnostics: Diagnostic[]
  emptyUsedCells: Array<{ row: number; column: number }>
  populatedUnusedCells: Array<{ row: number; column: number }>
  isValid: boolean
  alphaAnalysisAvailable: boolean
}

export type PointerLook = {
  x: number
  y: number
  angle: number | null
  directionIndex: number | null
  radius: number
}

export type StageBackground = 'grid' | 'dark' | 'light' | 'chroma'
