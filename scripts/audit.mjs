#!/usr/bin/env node
// Codebase audit — emits a JSON of concrete metrics + a human-readable summary,
// and compares against scripts/audit-baseline.json. Fails (exit 1) if a metric
// regresses past its tolerance.
//
// Replaces the letter-grade "this is a B+" vibe-checking with measurable targets.
//
// Run: `npm run audit` or `node scripts/audit.mjs [--write-baseline]`

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASELINE_PATH = join(__dirname, 'audit-baseline.json')

// ─── metric collectors ────────────────────────────────────────────────────

async function locByDir(dirs) {
  const out = {}
  for (const d of dirs) {
    const full = join(ROOT, d)
    if (!existsSync(full)) { out[d] = 0; continue }
    out[d] = await countLOC(full)
  }
  return out
}

async function countLOC(dir) {
  let total = 0
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'out' || e.name === 'dist' || e.name.startsWith('.')) continue
        total += await countLOC(p)
      } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) {
        const content = await readFile(p, 'utf-8')
        total += content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('//')).length
      }
    }
  } catch { /* skip */ }
  return total
}

async function registeredToolCount() {
  // Count `ToolDef` entries actually pushed into ALL_TOOLS — looks at the
  // tools/index.ts source. Done as a static scan to avoid loading the runtime.
  const path = join(ROOT, 'electron/main/engine/tools/index.ts')
  const layerBarrels = [
    'electron/main/engine/layer1-ingestion/index.ts',
    'electron/main/engine/layer2-execution/index.ts',
    'electron/main/engine/layer3-catalog/index.ts',
    'electron/main/engine/layer4-distribution/index.ts',
    'electron/main/engine/layer5-rendering/index.ts',
  ]
  let count = 0
  if (existsSync(path)) {
    const src = await readFile(path, 'utf-8')
    // Match identifier-style entries inside the ALL_TOOLS array
    const arrayMatch = src.match(/export const ALL_TOOLS[^=]*=\s*\[([\s\S]*?)\]/)
    if (arrayMatch) {
      // Count Tool identifiers (UpperCamelCase ending in Tool) and "...LAYERN_TOOLS" spreads
      const body = arrayMatch[1]
      count += (body.match(/[A-Z][A-Za-z0-9]*Tool\b/g) ?? []).length
      // Spreads: count each layer barrel's tool count
      const layerSpreads = body.match(/\.\.\.LAYER\d_TOOLS/g) ?? []
      for (const spread of layerSpreads) {
        const layerNum = spread.match(/LAYER(\d)/)?.[1]
        const barrel = layerBarrels.find((b) => b.includes(`layer${layerNum}-`))
        if (!barrel || !existsSync(join(ROOT, barrel))) continue
        const barrelSrc = await readFile(join(ROOT, barrel), 'utf-8')
        const layerArr = barrelSrc.match(/LAYER\d_TOOLS[^=]*=\s*\[([\s\S]*?)\]/)
        if (layerArr) count += (layerArr[1].match(/[A-Z][A-Za-z0-9]*Tool\b/g) ?? []).length
      }
    }
  }
  return count
}

async function fileCount(dir, glob) {
  if (!existsSync(join(ROOT, dir))) return 0
  let count = 0
  const re = new RegExp(glob)
  async function walk(p) {
    const entries = await readdir(p, { withFileTypes: true })
    for (const e of entries) {
      const full = join(p, e.name)
      if (e.isDirectory()) await walk(full)
      else if (re.test(e.name)) count++
    }
  }
  await walk(join(ROOT, dir))
  return count
}

async function bundleSize() {
  const dist = join(ROOT, 'out/renderer/assets')
  if (!existsSync(dist)) return { totalKb: 0, biggestChunkKb: 0, eagerKb: 0 }
  const entries = await readdir(dist)
  let total = 0
  let biggest = 0
  let eager = 0
  // "Eager" heuristic: anything that isn't an obvious mermaid/recharts diagram chunk
  const lazyPatterns = /^(mermaid|wardley|architecture|cytoscape|.*Diagram|gitGraph|sankey|chunk-|info-|timeline-)/
  for (const f of entries) {
    if (!f.endsWith('.js')) continue
    const s = await stat(join(dist, f))
    total += s.size
    biggest = Math.max(biggest, s.size)
    if (!lazyPatterns.test(f)) eager += s.size
  }
  return {
    totalKb: Math.round(total / 1024),
    biggestChunkKb: Math.round(biggest / 1024),
    eagerKb: Math.round(eager / 1024),
  }
}

function vitestCount() {
  try {
    const out = execSync('npm test --silent 2>&1', { cwd: ROOT, encoding: 'utf-8' })
    const match = out.match(/Tests\s+(\d+)\s+passed/)
    const filesMatch = out.match(/Test Files\s+(\d+)\s+passed/)
    const failMatch = out.match(/(\d+)\s+failed/)
    return {
      passed: match ? Number(match[1]) : 0,
      files: filesMatch ? Number(filesMatch[1]) : 0,
      failed: failMatch ? Number(failMatch[1]) : 0,
    }
  } catch (err) {
    return { passed: 0, files: 0, failed: -1, error: err.message }
  }
}

async function depCount() {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf-8'))
  return {
    prod: Object.keys(pkg.dependencies ?? {}).length,
    dev: Object.keys(pkg.devDependencies ?? {}).length,
  }
}

async function biggestFiles(limit = 10) {
  const targets = [join(ROOT, 'src'), join(ROOT, 'electron')]
  const all = []
  async function walk(p) {
    if (!existsSync(p)) return
    const entries = await readdir(p, { withFileTypes: true })
    for (const e of entries) {
      const full = join(p, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'out' || e.name === 'dist' || e.name.startsWith('.')) continue
        await walk(full)
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        const content = await readFile(full, 'utf-8')
        const loc = content.split('\n').length
        all.push({ path: full.slice(ROOT.length + 1), loc })
      }
    }
  }
  for (const t of targets) await walk(t)
  return all.sort((a, b) => b.loc - a.loc).slice(0, limit)
}

// ─── thresholds (metric rubric) ────────────────────────────────────────────

// Each metric: { name, value, target, tolerance, direction }
//   direction: 'lower-better' or 'higher-better'
//   tolerance: how much regression past baseline is allowed (in same unit)
const TARGETS = {
  // Bundle
  'bundle.eagerKb': { target: 4000, tolerance: 200, direction: 'lower-better' },
  'bundle.biggestChunkKb': { target: 1100, tolerance: 100, direction: 'lower-better' },
  'bundle.totalKb': { target: 9000, tolerance: 500, direction: 'lower-better' },
  // Code health
  'loc.electron/main': { target: 6000, tolerance: 500, direction: 'lower-better' },
  'loc.src': { target: 8000, tolerance: 500, direction: 'lower-better' },
  // Tests
  'tests.passed': { target: 130, tolerance: 0, direction: 'higher-better' },
  'tests.failed': { target: 0, tolerance: 0, direction: 'lower-better' },
  // Tools / Skills (counts via static scan, used for regression detection)
  'count.tools': { target: 25, tolerance: 0, direction: 'higher-better' },
  'count.skills': { target: 25, tolerance: 0, direction: 'higher-better' },
  // Deps
  'deps.prod': { target: 60, tolerance: 5, direction: 'lower-better' },
}

function gradeMetric(name, value, baseline) {
  const t = TARGETS[name]
  if (!t) return { name, value, status: 'untracked' }

  const better = t.direction === 'lower-better'
  const meetsTarget = better ? value <= t.target : value >= t.target

  if (baseline?.[name] !== undefined) {
    const regressed = better ? value > baseline[name] + t.tolerance : value < baseline[name] - t.tolerance
    if (regressed) return { name, value, baseline: baseline[name], target: t.target, status: 'REGRESSED' }
  }
  return { name, value, baseline: baseline?.[name], target: t.target, status: meetsTarget ? 'OK' : 'BELOW_TARGET' }
}

// ─── main ─────────────────────────────────────────────────────────────────

async function main() {
  const writeBaseline = process.argv.includes('--write-baseline')

  // eslint-disable-next-line no-console
  console.log('Auditing Nohi Central PRO...\n')

  const loc = await locByDir(['electron/main', 'src', 'tests'])
  const bundle = await bundleSize()
  const tools = await registeredToolCount()
  const skills = await fileCount('resources/skills', '\\.md$')
  const tests = vitestCount()
  const deps = await depCount()
  const big = await biggestFiles(10)

  const flat = {
    'loc.electron/main': loc['electron/main'],
    'loc.src': loc['src'],
    'loc.tests': loc['tests'],
    'bundle.totalKb': bundle.totalKb,
    'bundle.biggestChunkKb': bundle.biggestChunkKb,
    'bundle.eagerKb': bundle.eagerKb,
    'count.tools': tools,
    'count.skills': skills,
    'tests.passed': tests.passed,
    'tests.failed': tests.failed,
    'deps.prod': deps.prod,
    'deps.dev': deps.dev,
  }

  let baseline = {}
  if (existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf-8'))
  }

  // Grade each metric
  const grades = Object.keys(flat).map((k) => gradeMetric(k, flat[k], baseline))

  // ── Output ──
  // eslint-disable-next-line no-console
  console.log('Metrics:')
  for (const g of grades) {
    const mark = g.status === 'REGRESSED' ? '❌' : g.status === 'BELOW_TARGET' ? '⚠️ ' : g.status === 'OK' ? '✓' : '·'
    const trend = g.baseline !== undefined ? ` (was ${g.baseline})` : ''
    const target = g.target !== undefined ? ` → target ${g.target}` : ''
    // eslint-disable-next-line no-console
    console.log(`  ${mark} ${g.name.padEnd(28)} ${String(g.value).padStart(8)}${trend}${target}`)
  }

  // eslint-disable-next-line no-console
  console.log('\nTop 10 largest files:')
  for (const f of big) {
    // eslint-disable-next-line no-console
    console.log(`  ${String(f.loc).padStart(5)}  ${f.path}`)
  }

  const regressions = grades.filter((g) => g.status === 'REGRESSED')

  if (writeBaseline) {
    await writeFile(BASELINE_PATH, JSON.stringify(flat, null, 2))
    // eslint-disable-next-line no-console
    console.log(`\n✓ Wrote new baseline to ${BASELINE_PATH}`)
    process.exit(0)
  }

  if (regressions.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`\n❌ ${regressions.length} metric(s) regressed past baseline + tolerance.`)
    // eslint-disable-next-line no-console
    console.log('   Either fix the regression or run `npm run audit:bless` to update the baseline.')
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log(`\n✓ Audit clean. ${grades.filter((g) => g.status === 'OK').length} metrics meeting target.`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Audit script crashed:', err)
  process.exit(2)
})
