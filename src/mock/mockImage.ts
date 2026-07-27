// 模拟图片生成器：canvas 画出有构图感的抽象图，按提示词做确定性随机
// 预览版专用 —— 接入真实 API 后整个文件废弃

import type { ImageSize } from '@/types'
import { sizeToWH } from '@/types'

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 8 组明快清透的配色（浅色画廊主题）
const PALETTES: string[][] = [
  ['#B8CBE8', '#7C9CD4', '#4A6FB0', '#F4EFE4', '#E8B04A'],
  ['#F2D8CE', '#E0A69A', '#C96567', '#8A4E5E', '#FBF1E2'],
  ['#CDE8E0', '#7CC4B0', '#2A9D8F', '#E9C46A', '#F4A261'],
  ['#DCD6F2', '#9C90D8', '#52489C', '#F0EDFA', '#EF8354'],
  ['#E4DEF0', '#BFAED6', '#8E7BAF', '#F5EFFA', '#F2C46A'],
  ['#E2E6DC', '#B4BFAC', '#87947E', '#F4F2EA', '#C4CF9E'],
  ['#F0DCE2', '#D8A6B4', '#B75D69', '#774C60', '#FBF4EC'],
  ['#C2DCEC', '#87B8D4', '#4A90B8', '#F4B8AC', '#E06055'],
]

/** 生成一张模拟图，返回 dataUrl（webp，质量压低以省内存） */
export function renderMockImage(prompt: string, size: ImageSize, variant = 0): string {
  const { w, h } = sizeToWH(size)
  // 预览用一半分辨率渲染，视觉无差且省内存
  const scale = 0.5
  const cw = Math.round(w * scale)
  const ch = Math.round(h * scale)

  const rand = mulberry32(hashStr(prompt) + variant * 7919)
  const palette = PALETTES[Math.floor(rand() * PALETTES.length)]

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')!

  // 底：斜向大渐变
  const ang = rand() * Math.PI * 2
  const g = ctx.createLinearGradient(
    cw / 2 - Math.cos(ang) * cw, ch / 2 - Math.sin(ang) * ch,
    cw / 2 + Math.cos(ang) * cw, ch / 2 + Math.sin(ang) * ch,
  )
  g.addColorStop(0, palette[0])
  g.addColorStop(0.55, palette[1])
  g.addColorStop(1, palette[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cw, ch)

  // 中景：若干柔光圆斑
  const blobs = 3 + Math.floor(rand() * 4)
  for (let i = 0; i < blobs; i++) {
    const x = rand() * cw
    const y = rand() * ch
    const r = (0.15 + rand() * 0.4) * Math.min(cw, ch)
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    const c = palette[2 + Math.floor(rand() * 3)]
    rg.addColorStop(0, c + 'cc')
    rg.addColorStop(1, c + '00')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, cw, ch)
  }

  // 前景：一组几何构图元素（横线地平线 / 圆 / 三角山形，随机取一种母题）
  const motif = Math.floor(rand() * 3)
  ctx.globalAlpha = 0.85
  if (motif === 0) {
    // 地平线 + 太阳
    const hy = ch * (0.55 + rand() * 0.25)
    ctx.fillStyle = palette[0] + 'd0'
    ctx.fillRect(0, hy, cw, ch - hy)
    const sx = cw * (0.25 + rand() * 0.5)
    const sr = Math.min(cw, ch) * (0.08 + rand() * 0.1)
    ctx.fillStyle = palette[4]
    ctx.beginPath()
    ctx.arc(sx, hy - sr * (0.2 + rand() * 1.2), sr, 0, Math.PI * 2)
    ctx.fill()
  } else if (motif === 1) {
    // 同心圆
    const cx = cw * (0.3 + rand() * 0.4)
    const cy = ch * (0.3 + rand() * 0.4)
    for (let i = 5; i >= 1; i--) {
      ctx.fillStyle = palette[i % palette.length] + (i % 2 ? 'b0' : '70')
      ctx.beginPath()
      ctx.arc(cx, cy, i * Math.min(cw, ch) * 0.07, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    // 山形折线
    const peaks = 2 + Math.floor(rand() * 3)
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = palette[layer] + (layer === 2 ? 'e8' : '90')
      ctx.beginPath()
      ctx.moveTo(0, ch)
      const base = ch * (0.45 + layer * 0.16)
      for (let p = 0; p <= peaks; p++) {
        const px = (cw / peaks) * p
        const py = base - rand() * ch * 0.28
        ctx.lineTo(px, py)
      }
      ctx.lineTo(cw, ch)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  // 颗粒感：独立噪点画布低透明度叠加（putImageData 会整像素覆盖，不能直接用）
  const gs = 96
  const noiseCanvas = document.createElement('canvas')
  noiseCanvas.width = gs
  noiseCanvas.height = gs
  const nctx = noiseCanvas.getContext('2d')!
  const grain = nctx.createImageData(gs, gs)
  const d = grain.data
  for (let i = 0; i < d.length; i += 4) {
    const v = (rand() * 255) | 0
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  nctx.putImageData(grain, 0, 0)
  ctx.globalAlpha = 0.05
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(noiseCanvas, 0, 0, cw, ch)
  ctx.imageSmoothingEnabled = true
  ctx.globalAlpha = 1

  // 暗角（浅色版减淡）
  const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.45, cw / 2, ch / 2, Math.max(cw, ch) * 0.78)
  vg.addColorStop(0, '#00000000')
  vg.addColorStop(1, '#00000022')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, cw, ch)

  return canvas.toDataURL('image/webp', 0.72)
}
