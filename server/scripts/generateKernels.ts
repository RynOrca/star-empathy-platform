/**
 * 为已有故事批量生成 AI 内核
 * 用法：cd server && npx ts-node scripts/generateKernels.ts
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
  const stories = db.prepare(`
    SELECT s.id, s.title, s.content
    FROM stars s
    LEFT JOIN story_kernels sk ON s.id = sk.story_id
    WHERE sk.story_id IS NULL
    ORDER BY s.id
  `).all() as unknown as Story[]

  console.log(`📊 共 ${stories.length} 条故事需要生成内核\n`)

  let success = 0
  let fail = 0

  for (let i = 0; i < stories.length; i++) {
    const s = stories[i]
    process.stdout.write(`[${i + 1}/${stories.length}] 故事 #${s.id} "${(s.title || '').slice(0, 20)}"... `)
    try {
      await ensureKernel(s.id, s.content, s.title)
      console.log('✅')
      success++
    } catch (err: any) {
      console.log(`❌ ${err.message?.slice(0, 50)}`)
      fail++
    }

    // 避免 API 限流，每条间隔 500ms
    if (i < stories.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\n🎉 完成！成功 ${success}，失败 ${fail}`)
}

main().catch(console.error)