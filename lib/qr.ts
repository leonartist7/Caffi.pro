/**
 * Minimal dependency-free QR encoder → SVG path string.
 * Byte mode, error correction level M, versions 1–10 (plenty for a UUID
 * URL). Vendored so the pass page adds ZERO npm weight (Plan 2 rule:
 * no heavy QR package).
 *
 * Standard QR algorithm: RS error correction over GF(256), mask 0–7
 * evaluated with the 4 penalty rules, format info per ISO/IEC 18004.
 */

// GF(256) tables
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()

function rsGenPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= EXP[(LOG[poly[j]] + i) % 255]
      next[j + 1] ^= poly[j]
    }
    poly = next
  }
  // Built lowest-degree-first; rsEncode consumes highest-first (gen[0]=1)
  poly.reverse()
  return poly
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGenPoly(ecLen)
  const res = new Uint8Array(ecLen)
  for (const d of data) {
    const factor = d ^ res[0]
    res.copyWithin(0, 1)
    res[ecLen - 1] = 0
    if (factor !== 0) {
      for (let i = 0; i < ecLen; i++) {
        res[i] ^= EXP[(LOG[gen[i + 1]] + LOG[factor]) % 255]
      }
    }
  }
  return res
}

// [totalCodewords, ecPerBlock, group1Blocks, group1Data, group2Blocks, group2Data] for EC level M, v1..v10
const VERSIONS_M: number[][] = [
  [26, 10, 1, 16, 0, 0],
  [44, 16, 1, 28, 0, 0],
  [70, 26, 1, 44, 0, 0],
  [100, 18, 2, 32, 0, 0],
  [134, 24, 2, 43, 0, 0],
  [172, 16, 4, 27, 0, 0],
  [196, 18, 4, 31, 0, 0],
  [242, 22, 2, 38, 2, 39],
  [292, 22, 3, 36, 2, 37],
  [346, 26, 4, 43, 1, 44],
]

const ALIGN_POS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
]

export function qrToSvgPath(text: string): { path: string; size: number } {
  const bytes = new TextEncoder().encode(text)

  // Pick version
  let version = -1
  for (let v = 0; v < VERSIONS_M.length; v++) {
    const [total, ec, g1b, g1d, g2b, g2d] = VERSIONS_M[v]
    void total
    void ec
    const dataCap = g1b * g1d + g2b * g2d
    const bitsNeeded = 4 + (v + 1 <= 9 ? 8 : 16) + bytes.length * 8
    if (bitsNeeded <= dataCap * 8) {
      version = v + 1
      break
    }
  }
  if (version === -1) throw new Error('qr: payload too large')

  const [, ecPerBlock, g1b, g1d, g2b, g2d] = VERSIONS_M[version - 1]
  const dataCodewords = g1b * g1d + g2b * g2d

  // Build bitstream: mode 0100 (byte), count, data, terminator, pad
  const bits: number[] = []
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1)
  }
  pushBits(0b0100, 4)
  pushBits(bytes.length, version <= 9 ? 8 : 16)
  for (const b of bytes) pushBits(b, 8)
  for (let i = 0; i < 4 && bits.length < dataCodewords * 8; i++) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)
  const padBytes = [0xec, 0x11]
  let p = 0
  while (bits.length < dataCodewords * 8) pushBits(padBytes[p++ % 2], 8)

  const data = new Uint8Array(dataCodewords)
  for (let i = 0; i < dataCodewords; i++) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i * 8 + j]
    data[i] = byte
  }

  // Split into blocks, compute EC, interleave
  const blocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  let offset = 0
  for (let b = 0; b < g1b; b++) {
    const chunk = data.slice(offset, offset + g1d)
    offset += g1d
    blocks.push(chunk)
    ecBlocks.push(rsEncode(chunk, ecPerBlock))
  }
  for (let b = 0; b < g2b; b++) {
    const chunk = data.slice(offset, offset + g2d)
    offset += g2d
    blocks.push(chunk)
    ecBlocks.push(rsEncode(chunk, ecPerBlock))
  }
  const maxLen = Math.max(...blocks.map(b => b.length))
  const interleaved: number[] = []
  for (let i = 0; i < maxLen; i++) for (const b of blocks) if (i < b.length) interleaved.push(b[i])
  for (let i = 0; i < ecPerBlock; i++) for (const b of ecBlocks) interleaved.push(b[i])

  // Matrix
  const size = 17 + version * 4
  const modules: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))

  const setFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr
        const cc = c + dc
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
        const onRing = inOuter && (dr === 0 || dr === 6 || dc === 0 || dc === 6)
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        modules[rr][cc] = onRing || inCore
      }
    }
  }
  setFinder(0, 0)
  setFinder(0, size - 7)
  setFinder(size - 7, 0)

  // Timing
  for (let i = 8; i < size - 8; i++) {
    if (modules[6][i] === null) modules[6][i] = i % 2 === 0
    if (modules[i][6] === null) modules[i][6] = i % 2 === 0
  }

  // Alignment
  const aligns = ALIGN_POS[version - 1]
  const amin = aligns[0]
  const amax = aligns[aligns.length - 1]
  for (const r of aligns) {
    for (const c of aligns) {
      // Skip only the three finder corners; centers on the timing
      // row/column (v>=7) are REAL alignment patterns and must be placed.
      if ((r === amin && c === amin) || (r === amin && c === amax) || (r === amax && c === amin))
        continue
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
          modules[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1
        }
    }
  }

  // Version information (v >= 7): 6-bit version + BCH(18,6), G=0x1F25.
  // Two 6x3 blocks: above bottom-left finder and left of top-right finder.
  if (version >= 7) {
    let rem = version << 12
    for (let i = 17; i >= 12; i--) {
      if ((rem >> i) & 1) rem ^= 0x1f25 << (i - 12)
    }
    const vinfo = (version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const bit = ((vinfo >> i) & 1) === 1
      modules[Math.floor(i / 3)][size - 11 + (i % 3)] = bit
      modules[size - 11 + (i % 3)][Math.floor(i / 3)] = bit
    }
  }

  // Dark module + reserve format areas
  modules[size - 8][8] = true
  const formatCoords: [number, number][] = []
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      formatCoords.push([8, i])
      formatCoords.push([i, 8])
    }
  }
  for (let i = 0; i < 8; i++) {
    formatCoords.push([8, size - 1 - i])
    if (i < 7) formatCoords.push([size - 1 - i, 8])
  }
  for (const [r, c] of formatCoords) if (modules[r][c] === null) modules[r][c] = false

  // Place data (zigzag)
  const placements: [number, number][] = []
  {
    let bitIdx = 0
    let dir = -1
    let col = size - 1
    let row = size - 1
    const totalBits = interleaved.length * 8
    while (col > 0) {
      if (col === 6) col--
      while (row >= 0 && row < size) {
        for (const cc of [col, col - 1]) {
          if (modules[row][cc] !== null) continue
          let bit = false
          if (bitIdx < totalBits) {
            bit = ((interleaved[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1
          }
          modules[row][cc] = bit
          placements.push([row, cc])
          bitIdx++
        }
        row += dir
      }
      row = dir === -1 ? 0 : size - 1
      dir = -dir
      col -= 2
    }
  }

  // Try all 8 masks, pick lowest penalty
  const maskFns = [
    (r: number, c: number) => (r + c) % 2 === 0,
    (r: number) => r % 2 === 0,
    (_r: number, c: number) => c % 3 === 0,
    (r: number, c: number) => (r + c) % 3 === 0,
    (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r: number, c: number) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r: number, c: number) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r: number, c: number) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ]

  const penalty = (grid: boolean[][]): number => {
    let score = 0
    // Rule 1: runs
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < size; i++) {
        let run = 1
        for (let j = 1; j < size; j++) {
          const cur = pass === 0 ? grid[i][j] : grid[j][i]
          const prev = pass === 0 ? grid[i][j - 1] : grid[j - 1][i]
          if (cur === prev) run++
          else {
            if (run >= 5) score += run - 2
            run = 1
          }
        }
        if (run >= 5) score += run - 2
      }
    }
    // Rule 2: 2x2 blocks
    for (let r = 0; r < size - 1; r++)
      for (let c = 0; c < size - 1; c++) {
        const v = grid[r][c]
        if (grid[r][c + 1] === v && grid[r + 1][c] === v && grid[r + 1][c + 1] === v) score += 3
      }
    // Rule 3: finder-like patterns
    const pat1 = [true, false, true, true, true, false, true, false, false, false, false]
    const pat2 = [...pat1].reverse()
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < size; i++) {
        for (let j = 0; j <= size - 11; j++) {
          let m1 = true
          let m2 = true
          for (let k = 0; k < 11; k++) {
            const v = pass === 0 ? grid[i][j + k] : grid[j + k][i]
            if (v !== pat1[k]) m1 = false
            if (v !== pat2[k]) m2 = false
          }
          if (m1) score += 40
          if (m2) score += 40
        }
      }
    }
    // Rule 4: dark proportion
    let dark = 0
    for (const row of grid) for (const v of row) if (v) dark++
    const pct = (dark * 100) / (size * size)
    score += Math.floor(Math.abs(pct - 50) / 5) * 10
    return score
  }

  const bchFormat = (ecBits: number, mask: number): number => {
    let data = (ecBits << 3) | mask
    let rem = data << 10
    const G = 0b10100110111
    for (let i = 14; i >= 10; i--) {
      if ((rem >> i) & 1) rem ^= G << (i - 10)
    }
    return ((data << 10) | rem) ^ 0b101010000010010
  }

  let best: boolean[][] | null = null
  let bestMask = 0
  let bestScore = Infinity
  for (let m = 0; m < 8; m++) {
    const grid = modules.map(row => row.map(v => v === true))
    for (const [r, c] of placements) {
      if (maskFns[m](r, c)) grid[r][c] = !grid[r][c]
    }
    // Write format info (EC level M = 0b00), ISO/IEC 18004 layout
    const fmt = bchFormat(0b00, m)
    const fmtBits: boolean[] = []
    for (let i = 14; i >= 0; i--) fmtBits.push(((fmt >> i) & 1) === 1)
    // Around top-left finder
    const tl: [number, number][] = [
      [8, 0],
      [8, 1],
      [8, 2],
      [8, 3],
      [8, 4],
      [8, 5],
      [8, 7],
      [8, 8],
      [7, 8],
      [5, 8],
      [4, 8],
      [3, 8],
      [2, 8],
      [1, 8],
      [0, 8],
    ]
    tl.forEach(([r, c], i) => {
      grid[r][c] = fmtBits[i]
    })
    // Split copy: bottom-left column + top-right row
    const second: [number, number][] = [
      [size - 1, 8],
      [size - 2, 8],
      [size - 3, 8],
      [size - 4, 8],
      [size - 5, 8],
      [size - 6, 8],
      [size - 7, 8],
      [8, size - 8],
      [8, size - 7],
      [8, size - 6],
      [8, size - 5],
      [8, size - 4],
      [8, size - 3],
      [8, size - 2],
      [8, size - 1],
    ]
    second.forEach(([r, c], i) => {
      // second copy runs bit0→bit14 (LSB first): fmtBits[] is MSB-first
      grid[r][c] = fmtBits[14 - i]
    })
    grid[size - 8][8] = true // dark module always

    const s = penalty(grid)
    if (s < bestScore) {
      bestScore = s
      best = grid
      bestMask = m
    }
  }
  void bestMask

  // SVG path
  let path = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (best![r][c]) path += `M${c} ${r}h1v1h-1z`
    }
  }
  return { path, size }
}

/** Render a complete inline SVG string for the given text. */
export function qrSvg(text: string, fg = '#1F1612', bg = 'transparent'): string {
  const { path, size } = qrToSvgPath(text)
  const quiet = 4
  const total = size + quiet * 2
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    (bg !== 'transparent' ? `<rect width="${total}" height="${total}" fill="${bg}"/>` : '') +
    `<path transform="translate(${quiet} ${quiet})" d="${path}" fill="${fg}"/></svg>`
  )
}
