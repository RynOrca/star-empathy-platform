/**
 * DeepSeek API 封装
 * 兼容 OpenAI Chat Completions 格式
 *
 * 默认模型：deepseek-v4-flash（模型名已统一，deepseek-chat 已下线）
 *
 * 说明：
 *   · deepseek-v4-flash 默认「思考模式」，max_tokens 限制的是「思维链 + 最终答案」总长度，
 *     思考过长会把 token 耗尽（finish_reason=length），导致 content 为空或被截断
 *     （实测 JSON 任务与叙事都出现过，表现为「杜牧写：」等残句）。
 *     因此本项目所有调用统一关闭思考（thinking: { type: 'disabled' }），
 *     content 独占 max_tokens，输出完整稳定，也不会返回 reasoning_content。
 *   · 兜底保留：万一上游忽略 thinking 参数，content 空时仍尝试从 reasoning_content 提取 JSON。
 */

import fs from 'node:fs'
import path from 'node:path'

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
// 模型名已统一为 deepseek-v4-flash（deepseek-chat 已下线）
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

  const wantJson = options.jsonMode !== false
  const model = options.model || DEFAULT_MODEL
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.8,
    max_tokens: options.maxTokens ?? 2048,
    // 统一关闭思考模式：v4-flash 思考模式会把 max_tokens 耗在 reasoning_content，
    // 导致 content 为空/截断（实测 finish_reason=length）。产品输出均不需要公开思维链。
    thinking: { type: 'disabled' },
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
    choices: Array<{
      message: { content: string | null; reasoning_content?: string | null }
      finish_reason?: string | null
    }>
  }

  const message = json.choices?.[0]?.message
  const content = (message?.content ?? '').trim()
  const reasoning = (message?.reasoning_content ?? '').trim()
  const finishReason = json.choices?.[0]?.finish_reason

  // 思考关闭后理论上不会触发；若仍被截断（思考模式被上游忽略），明确报错提示
  if (finishReason === 'length') {
    throw new Error(`DeepSeek 输出被 max_tokens 截断（finish_reason=length），请增大 maxTokens（当前 ${options.maxTokens ?? 2048}）`)
  }

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
