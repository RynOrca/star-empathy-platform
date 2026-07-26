/**
 * 聊天服务 — Feature 2「古人陪看」
 * 角色扮演古人，SSE 流式返回对话
 */

import type { Response } from 'express'
import { getFigureById } from '../data/ancientFigures'
import type { ChatMessage } from './deepseek'

// 复用 deepseek 的配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

export interface ChatRequest {
  figureId: string
  message: string
  history?: ChatMessage[]
}

export interface StarContext {
  starName: string
  constellation: string
  magnitude?: number
  distance?: number
  relatedPoems?: string
  historicalContext?: string
}

/**
 * 构建星星上下文文本
 */
function buildStarContext(ctx: StarContext): string {
  const parts: string[] = []
  parts.push(`你正在观测的这颗星名为「${ctx.starName}」`)
  if (ctx.constellation) {
    parts.push(`位于${ctx.constellation}星座`)
  }
  if (ctx.magnitude !== undefined) {
    parts.push(`视星等 ${ctx.magnitude}`)
  }
  if (ctx.distance !== undefined) {
    parts.push(`距离地球约 ${ctx.distance} 光年`)
  }
  if (ctx.relatedPoems) {
    parts.push(`\n你与此星相关的诗句：${ctx.relatedPoems}`)
  }
  if (ctx.historicalContext) {
    parts.push(`\n你当时写这些诗句的历史背景：${ctx.historicalContext}`)
  }
  parts.push(`\n请基于你的真实历史背景和诗词，自然地与这位现代人对话。`)
  return parts.join('\n')
}

/**
 * SSE 流式聊天
 * 调用 DeepSeek API，通过 SSE 逐块推送回复
 */
export async function streamChat(
  res: Response,
  figureId: string,
  message: string,
  history: ChatMessage[],
  starContext?: StarContext,
): Promise<void> {
  const figure = getFigureById(figureId)
  if (!figure) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: '古人角色不存在' })}\n\n`)
    res.end()
    return
  }

  if (!DEEPSEEK_API_KEY) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI 服务未配置' })}\n\n`)
    res.end()
    return
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁用 nginx 缓冲

  // 构建 messages
  let systemContent = figure.systemPrompt
  systemContent += `\n\n## 回复格式要求（必须严格遵守）
- 第一行：动作或神态描写，用中文括号标注，例如：（望着星空，若有所思）
- 空一行
- 然后开始对话内容，每句话单独成段，段与段之间空一行
- 不要把所有内容挤在一行或一段里
- 每段 1~2 句话即可，保持简洁有力`

  if (starContext) {
    systemContent += `\n\n## 当前观测的星星\n${buildStarContext(starContext)}`
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...history,
    { role: 'user', content: message },
  ]

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.9,
        max_tokens: 500,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      res.write(`data: ${JSON.stringify({ type: 'error', message: `AI 请求失败 (${response.status})` })}\n\n`)
      res.end()
      return
    }

    // 读取 SSE 流
    const reader = response.body?.getReader()
    if (!reader) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: '无法读取 AI 响应流' })}\n\n`)
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: delta })}\n\n`)
          }
        } catch {
          // 跳过解析失败的行
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err) {
    console.error('Chat stream error:', err)
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI 服务连接失败' })}\n\n`)
    res.end()
  }
}