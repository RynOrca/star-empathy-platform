/**
 * DeepSeek API 封装
 * 兼容 OpenAI Chat Completions 格式
 * 默认模型：deepseek-v4-flash
 */

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

// 运行时 API Key（可通过 /api/settings 设置，优先级高于环境变量）
let runtimeApiKey: string | null = null

export function setApiKey(key: string | null) {
  runtimeApiKey = key
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
