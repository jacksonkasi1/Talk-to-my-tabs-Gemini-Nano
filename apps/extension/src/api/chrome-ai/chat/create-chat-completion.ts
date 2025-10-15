import type { ChatMessage } from '../types'
import { sendPrompt } from '../prompt/send-prompt'
import { sessionManager } from '@/utils/session-manager'

export interface ChatCompletionRequest {
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string
  }>
}

export const createChatCompletion = async (
  messages: ChatMessage[],
  options?: Partial<ChatCompletionRequest>
): Promise<ChatCompletionResponse> => {
  try {
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    // Use session manager to prevent crashes from session proliferation
    const session = await sessionManager.getSession({
      type: 'languageModel',
      options: {
        systemPrompt: systemMessage?.content as string,
        temperature: options?.temperature ?? 0.7,
        topK: 3
      }
    }) as LanguageModelSession

    const lastUserMessage = conversationMessages[conversationMessages.length - 1]
    if (!lastUserMessage || typeof lastUserMessage.content !== 'string') {
      throw new Error('No valid user message found')
    }

    const result = await sendPrompt(session, lastUserMessage.content)

    return {
      id: `chat-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: 'gemini-nano',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: result
          },
          finish_reason: 'stop'
        }
      ]
    }
  } catch (error) {
    console.error('Chat completion error:', error)
    throw error
  }
  // Session manager handles cleanup automatically
}
