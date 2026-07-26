/**
 * DeepSeek API 封装
 * 兼容 OpenAI Chat Completions 格式
 * 默认模型：deepseek-v4-flash
 */

import fs from 'node:fs'
import path from 'node:path'

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

// 运行时 API Key 持久化文件（兼容 ts-node 开发 和 tsc 编译后生产环境）
function resolveKeyFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), '.runtime-key'),
    path.resolve(__dirname, '../../.runtime-key'),
  ]
  // 优先返回已存在的文件路径；都不存在则用第一个（cwd 优先）
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]
}

const KEY_FILE = resolveKeyFilePath()

// 运行时 API Key（可通过 /api/settings 设置，优先级高于环境变量）
let runtimeApiKey: string | null = null

// 启动时从文件恢复
try {
  if (fs.existsSync(KEY_FILE)) {
    runtimeApiKey = fs.readFileSync(KEY_FILE, 'utf-8').trim()
    console.log(`🔑 已从文件加载 API Key (${KEY_FILE})`)
  } else {
    console.log(`ℹ️  未找到运行时 Key 文件 (${KEY_FILE})，将使用环境变量 DEEPSEEK_API_KEY`)
  }
} catch { /* ignore */ }

if (process.env.DEEPSEEK_API_KEY) {
  console.log('🔑 检测到环境变量 DEEPSEEK_API_KEY')
}

export function setApiKey(key: string | null) {
  runtimeApiKey = key
  // 持久化到文件
  try {
    if (key) {
      fs.writeFileSync(KEY_FILE, key, 'utf-8')
    } else if (fs.existsSync(KEY_FILE)) {
      fs.unlinkSync(KEY_FILE)
    }
  } catch { /* ignore */ }
}

export function getApiKey(): string | null {
  return runtimeApiKey || process.env.DEEPSEEK_API_KEY || null
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  enableSearch?: boolean
}

/**
 * 调用 DeepSeek Chat Completions API
 * @returns 生成的文本内容
 */
export async function deepseekChat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未设置，请在设置中配置或在环境变量中设置')
  }

  const model = options.model || DEFAULT_MODEL
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.8,
    max_tokens: options.maxTokens ?? 800,
  }

  // DeepSeek 联网搜索（如果模型支持）
  if (options.enableSearch) {
    body.enable_search = true
  }

  console.log(`🤖 DeepSeek 请求: ${model}, ${messages.length} 条消息`)

  const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`DeepSeek API 错误 (${res.status}):`, errText.slice(0, 300))
    throw new Error(`DeepSeek API 请求失败 (${res.status}): ${errText}`)
  }

  const json = await res.json() as {
    choices: Array<{ message: { content: string } }>
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) {
    console.error('DeepSeek API 返回内容为空，完整响应:', JSON.stringify(json).slice(0, 500))
    throw new Error('DeepSeek API 返回内容为空')
  }

  return content
}
