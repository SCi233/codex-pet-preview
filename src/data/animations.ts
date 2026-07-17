import {
  Activity,
  CircleEllipsis,
  Eye,
  Hand,
  HeartCrack,
  MoveLeft,
  MoveRight,
  ScanSearch,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const CELL_WIDTH = 192
export const CELL_HEIGHT = 208
export const ATLAS_COLUMNS = 8

export type AnimationDefinition = {
  id: string
  label: string
  shortLabel: string
  row: number
  frames: number
  durations: number[]
  icon: LucideIcon
  shortcut: string
}

const repeat = (duration: number, count: number, final?: number) =>
  Array.from({ length: count }, (_, index) =>
    index === count - 1 && final ? final : duration,
  )

export const ANIMATIONS: AnimationDefinition[] = [
  {
    id: 'idle',
    label: 'Idle · 待机',
    shortLabel: '待机',
    row: 0,
    frames: 6,
    durations: [280, 110, 110, 140, 140, 320],
    icon: CircleEllipsis,
    shortcut: '1',
  },
  {
    id: 'running-right',
    label: 'Running right · 向右移动',
    shortLabel: '向右',
    row: 1,
    frames: 8,
    durations: repeat(120, 8, 220),
    icon: MoveRight,
    shortcut: '2',
  },
  {
    id: 'running-left',
    label: 'Running left · 向左移动',
    shortLabel: '向左',
    row: 2,
    frames: 8,
    durations: repeat(120, 8, 220),
    icon: MoveLeft,
    shortcut: '3',
  },
  {
    id: 'waving',
    label: 'Waving · 挥手',
    shortLabel: '挥手',
    row: 3,
    frames: 4,
    durations: repeat(140, 4, 280),
    icon: Hand,
    shortcut: '4',
  },
  {
    id: 'jumping',
    label: 'Jumping · 跳跃',
    shortLabel: '跳跃',
    row: 4,
    frames: 5,
    durations: repeat(140, 5, 280),
    icon: Sparkles,
    shortcut: '5',
  },
  {
    id: 'failed',
    label: 'Failed · 失败',
    shortLabel: '失败',
    row: 5,
    frames: 8,
    durations: repeat(140, 8, 240),
    icon: HeartCrack,
    shortcut: '6',
  },
  {
    id: 'waiting',
    label: 'Waiting · 等待输入',
    shortLabel: '等待',
    row: 6,
    frames: 6,
    durations: repeat(150, 6, 260),
    icon: Eye,
    shortcut: '7',
  },
  {
    id: 'running',
    label: 'Running · 工作中',
    shortLabel: '工作',
    row: 7,
    frames: 6,
    durations: repeat(120, 6, 220),
    icon: Activity,
    shortcut: '8',
  },
  {
    id: 'review',
    label: 'Review · 审阅',
    shortLabel: '审阅',
    row: 8,
    frames: 6,
    durations: repeat(150, 6, 280),
    icon: ScanSearch,
    shortcut: '9',
  },
]

export const USED_COLUMNS_BY_ROW = [6, 8, 8, 4, 5, 8, 6, 6, 6, 8, 8]

export const LOOK_DIRECTIONS = [
  '000 · 上',
  '022.5 · 右上',
  '045 · 右上',
  '067.5 · 右上',
  '090 · 右',
  '112.5 · 右下',
  '135 · 右下',
  '157.5 · 右下',
  '180 · 下',
  '202.5 · 左下',
  '225 · 左下',
  '247.5 · 左下',
  '270 · 左',
  '292.5 · 左上',
  '315 · 左上',
  '337.5 · 左上',
]

export const directionToCell = (index: number) => ({
  row: index < 8 ? 9 : 10,
  column: index % 8,
})
