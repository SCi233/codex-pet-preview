# Codex Pet Preview

English | [简体中文](README.zh-CN.md)

A local-first previewer for Codex Pet packages. It runs entirely in your browser, never uploads files, and requires no backend.

## Screenshots

### Desktop

| English | Simplified Chinese |
| --- | --- |
| ![English desktop interface](docs/screenshots/app-en.png) | ![Simplified Chinese desktop interface](docs/screenshots/app-zh.png) |

### Responsive layout

<p align="center">
  <img src="docs/screenshots/app-responsive-en.png" alt="Responsive English interface" width="520" />
</p>

## Features

- Load a Pet folder, ZIP, `pet.json` plus spritesheet, or a standalone PNG / WebP atlas
- Support both legacy 8×9 atlases and v2 8×11 atlases
- Play all nine standard animations using the per-frame timing defined by Codex
- Play, pause, step through frames, change speed, loop, scale, and toggle pixel rendering
- Debug the v2 pointer-driven Look mode with 16 directions at 22.5° intervals, a configurable deadzone, live angle data, and cell coordinates
- Inspect the full atlas with a 192×208 cell grid
- Diagnose dimensions, version declarations, required cells, and transparency in unused cells directly in the browser
- Preview against dark, light, checkerboard, and chroma backgrounds with centerline and baseline guides
- Switch the complete interface between English and Simplified Chinese

## Getting started

Node.js 20.19 or later is required.

```bash
npm install
npm run dev
```

Open the local URL printed by the terminal, usually <http://localhost:5173>.

For a production build:

```bash
npm run build
npm run preview
```

## Supported package formats

Standard directory structure:

```text
my-pet/
├── pet.json
└── spritesheet.webp
```

Example `pet.json`:

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "description": "A tiny local pet.",
  "spriteVersionNumber": 2,
  "spritesheetPath": "spritesheet.webp"
}
```

Legacy atlases are `1536×1872` (8 columns × 9 rows). V2 atlases are `1536×2288` (8 columns × 11 rows) and must declare `spriteVersionNumber: 2`.

Each cell is fixed at `192×208`. V2 Look rows use this order:

```text
row 9:  000, 022.5, 045, 067.5, 090, 112.5, 135, 157.5
row 10: 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5
```

`000` points up on screen and `090` points right. The preview returns to Idle when the pointer enters the deadzone.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1`–`9` | Switch standard animation |
| `Space` | Play / pause |
| `←` / `→` | Previous / next frame |
| `L` | Toggle v2 Look mode |
| `G` | Toggle guides |

## Privacy and browser compatibility

Files are parsed through the File API, Canvas, and local object URLs. They never leave the current browser tab. ZIP files are extracted in memory with `fflate`.

Standard file selection works in modern browsers. Folder selection and dropping folders directly into the app work best in Chromium-based browsers. Safari and Firefox users can load a ZIP or select `pet.json` and the spritesheet together.

## Development commands

```bash
npm run lint
npm run build
```
