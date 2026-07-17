import { CELL_HEIGHT, CELL_WIDTH, USED_COLUMNS_BY_ROW } from '../data/animations'
import { translate, type Locale } from '../i18n'
import type { Diagnostic, LoadedPet, ValidationResult } from '../types/pet'

const makeDiagnostic = (
  id: string,
  label: string,
  detail: string,
  level: Diagnostic['level'],
): Diagnostic => ({ id, label, detail, level })

const scanCellAlpha = (
  pixels: Uint8ClampedArray,
  atlasWidth: number,
  row: number,
  column: number,
) => {
  const startX = column * CELL_WIDTH
  const startY = row * CELL_HEIGHT

  for (let y = startY; y < startY + CELL_HEIGHT; y += 1) {
    const rowOffset = y * atlasWidth * 4
    for (let x = startX; x < startX + CELL_WIDTH; x += 1) {
      if (pixels[rowOffset + x * 4 + 3] > 4) return true
    }
  }
  return false
}

export const validatePet = async (
  pet: LoadedPet,
  locale: Locale = 'en',
): Promise<ValidationResult> => {
  const diagnostics: Diagnostic[] = []
  const emptyUsedCells: Array<{ row: number; column: number }> = []
  const populatedUnusedCells: Array<{ row: number; column: number }> = []

  const dimensionsValid =
    pet.width === 1536 && (pet.height === 1872 || pet.height === 2288)
  diagnostics.push(
    makeDiagnostic(
      'dimensions',
      translate(locale, 'validation.dimensions'),
      dimensionsValid
        ? `${pet.width} × ${pet.height} · 8 × ${pet.rows} cells`
        : translate(locale, 'validation.dimensionsInvalid', {
            width: pet.width,
            height: pet.height,
          }),
      dimensionsValid ? 'pass' : 'error',
    ),
  )

  const declaredVersion = pet.manifest.spriteVersionNumber
  if (pet.inferredVersion === 2) {
    diagnostics.push(
      makeDiagnostic(
        'version',
        translate(locale, 'validation.spriteContract'),
        declaredVersion === 2
          ? translate(locale, 'validation.v2Match')
          : translate(locale, 'validation.v2DeclarationRequired'),
        declaredVersion === 2 ? 'pass' : 'error',
      ),
    )
  } else if (pet.inferredVersion === 1) {
    diagnostics.push(
      makeDiagnostic(
        'version',
        translate(locale, 'validation.spriteContract'),
        declaredVersion === 2
          ? translate(locale, 'validation.v2TooShort')
          : translate(locale, 'validation.legacyAtlas'),
        declaredVersion === 2 ? 'error' : 'warning',
      ),
    )
  } else {
    diagnostics.push(
      makeDiagnostic(
        'version',
        translate(locale, 'validation.spriteContract'),
        translate(locale, 'validation.unknownVersion'),
        'error',
      ),
    )
  }

  diagnostics.push(
    makeDiagnostic(
      'manifest',
      translate(locale, 'validation.packageManifest'),
      `${pet.manifest.id} · ${pet.manifest.displayName} · ${
        pet.manifestSource ?? translate(locale, 'package.autoInferred')
      }`,
      pet.manifestSource ? 'pass' : 'warning',
    ),
  )

  let alphaAnalysisAvailable = false
  if (dimensionsValid) {
    try {
      const bitmap = await createImageBitmap(pet.spriteFile)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Canvas 2D context unavailable')
      context.drawImage(bitmap, 0, 0)
      bitmap.close()
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      const rowCount = pet.inferredVersion === 2 ? 11 : 9

      for (let row = 0; row < rowCount; row += 1) {
        const usedColumns = USED_COLUMNS_BY_ROW[row]
        for (let column = 0; column < 8; column += 1) {
          const populated = scanCellAlpha(pixels, canvas.width, row, column)
          if (column < usedColumns && !populated) emptyUsedCells.push({ row, column })
          if (column >= usedColumns && populated) {
            populatedUnusedCells.push({ row, column })
          }
        }
      }
      alphaAnalysisAvailable = true
    } catch {
      alphaAnalysisAvailable = false
    }
  }

  if (!alphaAnalysisAvailable) {
    diagnostics.push(
      makeDiagnostic(
        'cells',
        translate(locale, 'validation.cellOccupancy'),
        translate(locale, 'validation.pixelUnavailable'),
        'warning',
      ),
    )
  } else if (emptyUsedCells.length || populatedUnusedCells.length) {
    const parts = []
    if (emptyUsedCells.length) {
      parts.push(
        translate(locale, 'validation.emptyRequired', {
          count: emptyUsedCells.length,
        }),
      )
    }
    if (populatedUnusedCells.length) {
      parts.push(
        translate(locale, 'validation.populatedUnused', {
          count: populatedUnusedCells.length,
        }),
      )
    }
    diagnostics.push(
      makeDiagnostic(
        'cells',
        translate(locale, 'validation.cellOccupancy'),
        parts.join(locale === 'zh' ? '；' : '; '),
        'error',
      ),
    )
  } else {
    diagnostics.push(
      makeDiagnostic(
        'cells',
        translate(locale, 'validation.cellOccupancy'),
        translate(locale, 'validation.cellsValid'),
        'pass',
      ),
    )
  }

  return {
    diagnostics,
    emptyUsedCells,
    populatedUnusedCells,
    isValid: diagnostics.every((diagnostic) => diagnostic.level !== 'error'),
    alphaAnalysisAvailable,
  }
}
