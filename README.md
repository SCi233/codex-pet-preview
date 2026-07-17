# Codex Pet Preview

一个 local-first 的 Codex Pet 包预览器。它完全运行在浏览器中，不上传文件，也不需要后端。

## 功能

- 加载 Pet 文件夹、ZIP、`pet.json` + spritesheet，或单张 PNG / WebP atlas
- 同时兼容旧版 8×9 atlas 和 v2 8×11 atlas
- 按 Codex 约定的逐帧时长播放 9 个标准动画
- 播放 / 暂停、逐帧、变速、循环、缩放与像素渲染
- v2 光标 Look 模式：16 个 22.5° 方向、deadzone、实时角度与 cell 定位
- Atlas 全图和 192×208 cell 网格检查
- 浏览器内结构诊断：尺寸、版本声明、必需 cell、未使用 cell 透明度
- 深色、浅色、棋盘格和 chroma 背景，附带中心线与基线辅助线

## 启动

需要 Node.js 20.19+。

```bash
npm install
npm run dev
```

然后打开终端输出的本地地址，通常是 <http://localhost:5173>。

生产构建：

```bash
npm run build
npm run preview
```

## 支持的包格式

标准目录结构：

```text
my-pet/
├── pet.json
└── spritesheet.webp
```

`pet.json` 示例：

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "description": "A tiny local pet.",
  "spriteVersionNumber": 2,
  "spritesheetPath": "spritesheet.webp"
}
```

旧版 atlas 为 `1536×1872`（8 列 × 9 行）。v2 atlas 为 `1536×2288`（8 列 × 11 行），必须声明 `spriteVersionNumber: 2`。

每个 cell 固定为 `192×208`。v2 的 Look rows 顺序如下：

```text
row 9:  000, 022.5, 045, 067.5, 090, 112.5, 135, 157.5
row 10: 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5
```

`000` 表示屏幕向上，`090` 表示屏幕向右。光标进入 deadzone 时回到 Idle。

## 快捷键

| 按键 | 动作 |
| --- | --- |
| `1`–`9` | 切换标准动画 |
| `Space` | 播放 / 暂停 |
| `←` / `→` | 上一帧 / 下一帧 |
| `L` | 切换 v2 Look 模式 |
| `G` | 切换辅助线 |

## 隐私与浏览器兼容

文件通过 File API、Canvas 和本地 Object URL 解析，不会离开当前浏览器标签。ZIP 由 `fflate` 在内存中解压。

常规文件选择适用于现代浏览器。文件夹选择和直接拖入文件夹建议使用 Chromium 系浏览器；Safari / Firefox 可以改用 ZIP 或同时选择 `pet.json` 与 spritesheet。

## 开发命令

```bash
npm run lint
npm run build
```
