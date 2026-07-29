/**
 * 为已有故事批量生成 AI 内核（并发加速版）
 * 用法：cd server && npx ts-node scripts/generateKernels.ts [concurrency]
 * 默认并发数 3，可通过参数调整，如：npx ts-node scripts/generateKernels.ts 5
 */

import 'dotenv/config'
import db from '../src/db'
import { ensureKernel } from '../src/services/kernel'

interface Story {
  id: number
  title: string | null
  content: string
}

async function main() {
  const concurrency = parseInt(process.argv[2] || '3', 10)

  const stories = db.prepare(`
    SELECT s.id, s.title, s.content
    FROM stars s
    LEFT JOIN story_kernels sk ON s.id = sk.story_id
    WHERE sk.story_id IS NULL
    ORDER BY s.id
  `).all() as unknown as Story[]

  if (stories.length === 0) {
    console.log('✅ 所有故事已有内核，无需生成')
    return
  }

  console.log(`📊 共 ${stories.length} 条故事需要生成内核（并发数: ${concurrency}）\n`)

  let success = 0
  let fail = 0
  let index = 0
  const start = Date.now()

  async function worker(): Promise<void> {
    while (true) {
      const i = index++
      if (i >= stories.length) return
      const s = stories[i]
      process.stdout.write(`[${i + 1}/${stories.length}] 故事 #${s.id} "${(s.title || '').slice(0, 20)}"... `)
      try {
        await ensureKernel(s.id, s.content, s.title)
        console.log('✅')
        success++
      } catch (err: any) {
        console.log(`❌ ${err.message?.slice(0, 80)}`)
        fail++
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, stories.length) }, () => worker())
  await Promise.all(workers)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n🎉 完成！成功 ${success}，失败 ${fail}，耗时 ${elapsed}s`)
  if (fail > 0) {
    console.log(`   失败的故事可在下次启动服务时自动重试补全`)
  }
}

main().catch(console.error)
