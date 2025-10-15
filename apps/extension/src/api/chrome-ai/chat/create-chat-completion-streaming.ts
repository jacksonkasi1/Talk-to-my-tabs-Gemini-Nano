import type { ChatMessage } from '../types'
import { streamPrompt } from '../prompt/stream-prompt'
import { sessionManager } from '@/utils/session-manager'

export const createChatCompletionStreaming = async (
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  options?: {
    temperature?: number
  }
): Promise<LanguageModelSession> => {
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

    await streamPrompt(session, lastUserMessage.content, onChunk)

    return session
  } catch (error) {
    console.error('Chat completion streaming error:', error)
    throw error
  }
  // Session manager handles cleanup automatically
}
