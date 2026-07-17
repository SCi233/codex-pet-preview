import { CELL_HEIGHT, CELL_WIDTH, USED_COLUMNS_BY_ROW } from '../data/animations'
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

export const validatePet = async (pet: LoadedPet): Promise<ValidationResult> => {
  const diagnostics: Diagnostic[] = []
  const emptyUsedCells: Array<{ row: number; column: number }> = []
  const populatedUnusedCells: Array<{ row: number; column: number }> = []

  const dimensionsValid =
    pet.width === 1536 && (pet.height === 1872 || pet.height === 2288)
  diagnostics.push(
    makeDiagnostic(
      'dimensions',
      '图集尺寸',
      dimensionsValid
        ? `${pet.width} × ${pet.height} · 8 × ${pet.rows} cells`
        : `${pet.width} × ${pet.height}；应为 1536 × 1872 或 1536 × 2288`,
      dimensionsValid ? 'pass' : 'error',
    ),
  )

  const declaredVersion = pet.manifest.spriteVersionNumber
  if (pet.inferredVersion === 2) {
    diagnostics.push(
      makeDiagnostic(
        'version',
        'Sprite contract',
        declaredVersion === 2
          ? 'v2 manifest 与 11 行图集匹配'
          : '11 行图集必须在 pet.json 中声明 spriteVersionNumber: 2',
        declaredVersion === 2 ? 'pass' : 'error',
      ),
    )
  } else if (pet.inferredVersion === 1) {
    diagnostics.push(
      makeDiagnostic(
        'version',
        'Sprite contract',
        declaredVersion === 2
          ? 'manifest 声明 v2，但图集只有 9 行'
          : '兼容旧版 9 行 atlas；look directions 不可用',
        declaredVersion === 2 ? 'error' : 'warning',
      ),
    )
  } else {
    diagnostics.push(
      makeDiagnostic(
        'version',
        'Sprite contract',
        '无法从图集尺寸推断 Codex Pet 版本',
        'error',
      ),
    )
  }

  diagnostics.push(
    makeDiagnostic(
      'manifest',
      'Package manifest',
      `${pet.manifest.id} · ${pet.manifest.displayName} · ${pet.manifestSource}`,
      pet.manifestSource.startsWith('自动推断') ? 'warning' : 'pass',
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
        'Cell occupancy',
        '浏览器无法读取像素；已跳过透明单元格检查',
        'warning',
      ),
    )
  } else if (emptyUsedCells.length || populatedUnusedCells.length) {
    const parts = []
    if (emptyUsedCells.length) parts.push(`${emptyUsedCells.length} 个必需 cell 为空`)
    if (populatedUnusedCells.length) {
      parts.push(`${populatedUnusedCells.length} 个未使用 cell 不透明`)
    }
    diagnostics.push(
      makeDiagnostic('cells', 'Cell occupancy', parts.join('；'), 'error'),
    )
  } else {
    diagnostics.push(
      makeDiagnostic(
        'cells',
        'Cell occupancy',
        '所有必需 cell 非空，未使用 cell 保持透明',
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
