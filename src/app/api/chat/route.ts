import { createLLMClient } from '@/lib/llm-client'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { messages, dataContext } = await req.json()

    const systemPrompt = `You are an expert data analyst assistant for a large company's data platform support program. You have access to the following support thread dataset summary:

${dataContext}

Answer questions about this support data concisely and insightfully. When asked about specific dates, platforms, engineers, ticket types, or trends, reference the actual data provided. Format numbers clearly. If a metric isn't in the data, say so honestly. Keep responses executive-friendly — clear, concise, and actionable.`

    const recentMessages = messages.slice(-15)

    const llm = createLLMClient()
    const response = await llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentMessages,
      ],
      temperature: 0.3,
      max_tokens: 800,
    })

    return Response.json({
      message: response.choices[0]?.message?.content ?? 'No response generated.',
    })
  } catch (error: unknown) {
    const err = error as { status?: number; error?: string; message?: string }
    if (err?.status === 402) {
      return Response.json(
        { error: 'AI chat is currently unavailable. The API key may be missing or has insufficient balance. Please add LLM_API_KEY to your .env.local file.' },
        { status: 402 }
      )
    }
    return Response.json({ error: err?.message ?? 'Failed to get response' }, { status: 500 })
  }
}