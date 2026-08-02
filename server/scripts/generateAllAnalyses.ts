/**
 * CLI: generateAllAnalyses
 *
 * 用法：
 *   # 默认：前 20 颗按故事数 DESC 排的星，跳过已 ready 的
 *   npm run agent:analyze
 *
 *   # 前 50 颗
 *   npm run agent:analyze -- --limit 50
 *
 *   # 强制重算指定 3 颗星（忽略 story_hash）
 *   npm run agent:analyze -- --ids 114,162,175 --force
 *
 *   # 只跑 themehour（便宜，先把 3 段文铺一遍）
 *   npm run agent:analyze -- --only themehour
 */

import 'dotenv/config'
import { runAll, ensureOne, listPrioritizedStars } from '../src/agents/starAnalysisAgent'
import type { AgentStep } from '../src/agents/starAnalysisAgent'

type Args = {
  limit: number
  minStories: number
  ids?: string[]
  force: boolean
  only?: AgentStep[]
  listOnly: boolean
  skipReady: boolean
  throttle: number
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const args: Args = {
    limit: 20,
    minStories: 1,
    force: false,
    listOnly: false,
    skipReady: true,
    throttle: 1200,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    switch (a) {
      case '--limit':      args.limit = Number(argv[++i]); break
      case '--min-stories': args.minStories = Number(argv[++i]); break
      case '--ids':
        args.ids = String(argv[++i]).split(',').map(s => s.trim()).filter(Boolean)
        break
      case '--only': {
        const v = String(argv[++i]).split(',').map(s => s.trim() as AgentStep)
        args.only = v.filter(x => (['themehour', 'persona', 'emotion'] as AgentStep[]).includes(x))
        break
      }
      case '--force':   args.force = true; args.skipReady = false; break
      case '--no-skip': args.skipReady = false; break
      case '--list':    args.listOnly = true; break
      case '--throttle': args.throttle = Number(argv[++i]); break
      case '-h':
      case '--help':
        console.log(`
generateAllAnalyses —— 批量生成 catalog_star_analyses 三栏 AI 内容

Options:
  --limit N           处理多少颗星（默认 20，按故事数 DESC + 星亮度排序）
  --min-stories N     只处理 ≥N 条故事的星（默认 1）
  --ids id1,id2,...   白名单，只处理这些 catalog_star_id
  --only themehour|persona|emotion  只跑其中一步或多步（逗号分隔）
  --force             忽略 story_hash 强制重算
  --no-skip           不跳过已 ready 的（但仍按 story_hash 算，需要强制用 --force）
  --throttle MS       每次 DeepSeek 之间的 sleep ms（默认 1200）
  --list              只列出计划处理的星，不真正调用 AI
  -h, --help          显示本帮助
`)
        process.exit(0)
    }
  }
  return args
}

function fmtNum(n: number): string {
  return n.toLocaleString('zh-CN')
}

async function main() {
  const args = parseArgs()

  if (args.listOnly) {
    const list = listPrioritizedStars({
      limit: args.limit,
      minStories: args.minStories,
      onlyCatalogIds: args.ids,
    })
    console.log(`\n📋 计划处理 ${list.length} 颗星：`)
    for (const s of list) {
      const name = s.catalogName ? `${s.catalogName.padEnd(10)}` : '未命名    '
      const mag = s.catalogMag == null ? ' -- ' : s.catalogMag.toFixed(2).padStart(5)
      console.log(`  id=${String(s.catalogStarId).padEnd(6)}  ${name}  mag=${mag}  stories=${fmtNum(s.total)}`)
    }
    return
  }

  const start = Date.now()
  const meta = { starName: '未命名星', constellation: '未分星座' }
  console.log(`\n🚀 starAnalysisAgent 启动
  limit       = ${args.limit}
  minStories  = ${args.minStories}
  ids         = ${args.ids?.join(',') ?? '(全部按优先级)'}
  onlySteps   = ${args.only?.join(',') ?? '(themehour + persona + emotion)'}
  force       = ${args.force}
  skipReady   = ${args.skipReady}
  throttle    = ${args.throttle}ms
`)

  if (args.ids?.length && args.limit === 20) {
    // 白名单模式：对每颗 id 直接 ensureOne，避免 listPrioritizedStars 因没故事排不上
    let i = 0
    const total = args.ids.length
    for (const id of args.ids) {
      i++
      console.log(`\n🔭 [${i}/${total}] id=${id}`)
      await ensureOne(id, {
        meta,
        force: args.force,
        onlySteps: args.only,
        throttleMs: args.throttle,
        onProgress: e => {
          const tag = e.ok ? '✅' : '⚠️'
          const extra = e.err ? ` — ${e.err.slice(0, 80)}` : ''
          console.log(`   ${tag} ${e.step}${extra}`)
        },
      })
    }
    const secs = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`\n🏁 完成。耗时 ${secs}s，共 ${total} 颗星。`)
    return
  }

  const summary = await runAll({
    meta,
    limit: args.limit,
    minStories: args.minStories,
    onlyCatalogIds: args.ids,
    force: args.force,
    onlySteps: args.only,
    skipReady: args.skipReady,
    throttleMs: args.throttle,
    onProgress: e => {
      const tag = e.ok ? '✅' : '⚠️'
      const extra = e.err ? ` — ${e.err.slice(0, 80)}` : ''
      console.log(`   [id=${e.catalogStarId}] ${tag} ${e.step}${extra}`)
    },
  })
  const secs = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`
📊 汇总
  planned      = ${summary.planned.length}
  skippedReady = ${summary.skippedReady.length}
  ok           = ${summary.ok.length}
  partial      = ${summary.partial.length}
  failed       = ${summary.failed.length}
  耗时          = ${secs}s
`)
  if (summary.partial.length) {
    console.log('\nPartial（缺某阶段）:')
    for (const p of summary.partial) console.log(`  id=${p.id} missing=${p.missing}`)
  }
  if (summary.failed.length) {
    console.log('\nFailed:')
    for (const f of summary.failed) console.log(`  id=${f.id} err=${f.err.slice(0, 120)}`)
  }
}

main().catch(e => {
  console.error('❌ CLI 异常退出:', e)
  process.exit(1)
})
