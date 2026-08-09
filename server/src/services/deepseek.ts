/**
 * DeepSeek API 封装
 * 兼容 OpenAI Chat Completions 格式
 *
 * 默认模型：deepseek-chat（V3 非思考模型）
 *
 * 说明：
 *   · deepseek-v4-flash / deepseek-reasoner 属于「思考模型」，它会把正式答案放在
 *     `content`，把思维链放在 `reasoning_content`。但如果 prompt 要求严格 JSON，模型偶
 *     发会只写 reasoning_content 而 content 为空。对此我们做了 3 层兜底：
 *       1) content 空 -> 用 reasoning_content 里解析 JSON
 *       2) 还是空 -> 自动 sleep 后 retry 一次（思考模型偶尔首轮只推理不输出正文）
 *       3) 实在不行抛错（上层 generator 会写 partial 并跳过）
 *   · 不建议把默认模型换成思考模型（又慢又贵又不稳定，JSON 任务 V3 足够）
 */

import fs from 'node:fs'
import path from 'node:path'

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
// JSON 任务：非思考模型（deepseek-chat = V3）更便宜更稳，不要用 V4/R1
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

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
  /**
   * 是否启用 response_format={type:"json_object"}。
   * 注意：DeepSeek/OpenAI 对这个模式有硬约束——prompt 里必须出现「json」这个词，
   * 否则会直接 400。写"古今共望"叙事 Markdown 的时候请显式传 false。
   */
  jsonMode?: boolean
}

/**
 * 调用 DeepSeek Chat Completions API
 * @returns 生成的文本内容
 */
export async function deepseekChat(
  messages: ChatMessage[],
  options: ChatOptions = {},
  _retry = 0,
): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未设置，请在设置中配置或在环境变量中设置')
  }

  // JSON 任务（默认开）：思考模型（v4-flash / reasoner / R1 等）会把正式答案放
  // reasoning_content 而 content 为空，实测不稳定 → 一律回退非思考模型 deepseek-chat。
  // 自由文/聊天任务（jsonMode=false）不受影响，继续用配置模型。
  const wantJson = options.jsonMode !== false
  const THINKING_MODELS = ['deepseek-v4-flash', 'deepseek-v4', 'deepseek-reasoner', 'deepseek-r1', 'deepseek-r1-0528']
  let model = options.model || DEFAULT_MODEL
  if (wantJson && THINKING_MODELS.includes(model.toLowerCase())) {
    console.warn(`⚠️ [deepseek] JSON 任务使用思考模型 ${model} 不稳定，回退 deepseek-chat`)
    model = 'deepseek-chat'
  }
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
  // JSON 模式（默认开；写叙事等 Markdown/自由文任务显式 jsonMode=false）
  if (wantJson) body.response_format = { type: 'json_object' }

  console.log(`🤖 DeepSeek 请求: ${model}, ${messages.length} 条消息 (try=${_retry + 1})`)

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
    // 429 或 5xx：自动重试一次
    if (_retry === 0 && (res.status === 429 || res.status >= 500)) {
      await sleep(1500)
      return deepseekChat(messages, options, _retry + 1)
    }
    throw new Error(`DeepSeek API 请求失败 (${res.status}): ${errText}`)
  }

  const json = await res.json() as {
    choices: Array<{ message: { content: string | null; reasoning_content?: string | null } }>
  }

  const message = json.choices?.[0]?.message
  const content = (message?.content ?? '').trim()
  const reasoning = (message?.reasoning_content ?? '').trim()

  // 1) 正常情况：content 有值直接用
  if (content) return content

  // 2) content 空但 reasoning_content 里含 JSON：可能是思考模型没把答案输出到 content，
  //    就把 reasoning 里的 JSON 抠出来（通常最后一段是结论 JSON）
  if (reasoning) {
    const extracted = extractJsonFromText(reasoning)
    if (extracted) {
      console.warn('⚠️ [deepseek] content 为空，从 reasoning_content 提取 JSON 成功')
      return extracted
    }
  }

  // 3) 首轮没出正文：自动重试一次
  if (_retry === 0) {
    console.warn('⚠️ [deepseek] content 为空，1.5s 后重试一次')
    await sleep(1500)
    return deepseekChat(messages, options, _retry + 1)
  }

  console.error('DeepSeek API 返回内容为空，完整响应:', JSON.stringify(json).slice(0, 500))
  throw new Error('DeepSeek API 返回内容为空')
}

// ──────────────────────── utils ────────────────────────

/**
 * 从一坨自由文（reasoning_content）里抓最像 JSON 的块（{} 对里最外层的那个）。
 * 找不到返回 null。
 */
function extractJsonFromText(text: string): string | null {
  // 先取 ```json``` fence
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence && fence[1]?.trim()) return fence[1].trim()
  const l = text.lastIndexOf('{')
  const r = text.lastIndexOf('}')
  if (l >= 0 && r > l) {
    const candidate = text.slice(l, r + 1)
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      return null
    }
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms))
}
