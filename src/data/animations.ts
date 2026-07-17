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
import type { Locale } from '../i18n'

export const CELL_WIDTH = 192
export const CELL_HEIGHT = 208
export const ATLAS_COLUMNS = 8

export type AnimationDefinition = {
  id: string
  label: Record<Locale, string>
  shortLabel: Record<Locale, string>
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
    label: { en: 'Idle', zh: '待机' },
    shortLabel: { en: 'Idle', zh: '待机' },
    row: 0,
    frames: 6,
    durations: [280, 110, 110, 140, 140, 320],
    icon: CircleEllipsis,
    shortcut: '1',
  },
  {
    id: 'running-right',
    label: { en: 'Running right', zh: '向右移动' },
    shortLabel: { en: 'Right', zh: '向右' },
    row: 1,
    frames: 8,
    durations: repeat(120, 8, 220),
    icon: MoveRight,
    shortcut: '2',
  },
  {
    id: 'running-left',
    label: { en: 'Running left', zh: '向左移动' },
    shortLabel: { en: 'Left', zh: '向左' },
    row: 2,
    frames: 8,
    durations: repeat(120, 8, 220),
    icon: MoveLeft,
    shortcut: '3',
  },
  {
    id: 'waving',
    label: { en: 'Waving', zh: '挥手' },
    shortLabel: { en: 'Wave', zh: '挥手' },
    row: 3,
    frames: 4,
    durations: repeat(140, 4, 280),
    icon: Hand,
    shortcut: '4',
  },
  {
    id: 'jumping',
    label: { en: 'Jumping', zh: '跳跃' },
    shortLabel: { en: 'Jump', zh: '跳跃' },
    row: 4,
    frames: 5,
    durations: repeat(140, 5, 280),
    icon: Sparkles,
    shortcut: '5',
  },
  {
    id: 'failed',
    label: { en: 'Failed', zh: '失败' },
    shortLabel: { en: 'Failed', zh: '失败' },
    row: 5,
    frames: 8,
    durations: repeat(140, 8, 240),
    icon: HeartCrack,
    shortcut: '6',
  },
  {
    id: 'waiting',
    label: { en: 'Waiting', zh: '等待输入' },
    shortLabel: { en: 'Waiting', zh: '等待' },
    row: 6,
    frames: 6,
    durations: repeat(150, 6, 260),
    icon: Eye,
    shortcut: '7',
  },
  {
    id: 'running',
    label: { en: 'Running', zh: '工作中' },
    shortLabel: { en: 'Running', zh: '工作' },
    row: 7,
    frames: 6,
    durations: repeat(120, 6, 220),
    icon: Activity,
    shortcut: '8',
  },
  {
    id: 'review',
    label: { en: 'Review', zh: '审阅' },
    shortLabel: { en: 'Review', zh: '审阅' },
    row: 8,
    frames: 6,
    durations: repeat(150, 6, 280),
    icon: ScanSearch,
    shortcut: '9',
  },
]

export const USED_COLUMNS_BY_ROW = [6, 8, 8, 4, 5, 8, 6, 6, 6, 8, 8]

export const LOOK_DIRECTIONS = [
  { en: '000 · Up', zh: '000 · 上' },
  { en: '022.5 · Upper right', zh: '022.5 · 右上' },
  { en: '045 · Upper right', zh: '045 · 右上' },
  { en: '067.5 · Upper right', zh: '067.5 · 右上' },
  { en: '090 · Right', zh: '090 · 右' },
  { en: '112.5 · Lower right', zh: '112.5 · 右下' },
  { en: '135 · Lower right', zh: '135 · 右下' },
  { en: '157.5 · Lower right', zh: '157.5 · 右下' },
  { en: '180 · Down', zh: '180 · 下' },
  { en: '202.5 · Lower left', zh: '202.5 · 左下' },
  { en: '225 · Lower left', zh: '225 · 左下' },
  { en: '247.5 · Lower left', zh: '247.5 · 左下' },
  { en: '270 · Left', zh: '270 · 左' },
  { en: '292.5 · Upper left', zh: '292.5 · 左上' },
  { en: '315 · Upper left', zh: '315 · 左上' },
  { en: '337.5 · Upper left', zh: '337.5 · 左上' },
]

export const directionToCell = (index: number) => ({
  row: index < 8 ? 9 : 10,
  column: index % 8,
})
