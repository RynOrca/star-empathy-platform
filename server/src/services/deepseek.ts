/**
 * DeepSeek API 封装
 * 兼容 OpenAI Chat Completions 格式
 * 默认模型：deepseek-v4-flash
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

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
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未设置，请在环境变量中配置')
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
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
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
