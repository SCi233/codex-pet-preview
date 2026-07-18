declare module 'gifenc' {
  type Palette = number[][]

  type QuantizeOptions = {
    format?: 'rgb565' | 'rgb444' | 'rgba4444'
    oneBitAlpha?: boolean | number
  }

  type WriteFrameOptions = {
    palette: Palette
    delay?: number
    repeat?: number
    dispose?: number
    transparent?: boolean
    transparentIndex?: number
  }

  type Encoder = {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      options: WriteFrameOptions,
    ) => void
    finish: () => void
    bytes: () => Uint8Array
  }

  export const GIFEncoder: () => Encoder
  export const quantize: (
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions,
  ) => Palette
  export const applyPalette: (
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ) => Uint8Array
}
