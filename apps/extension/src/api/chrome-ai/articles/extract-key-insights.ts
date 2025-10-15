import { sendPrompt } from '../prompt/send-prompt'
import { sessionManager } from '@/utils/session-manager'

export const extractKeyInsights = async (content: string): Promise<string[]> => {
  try {
    const systemPrompt = 'Extract 3-5 key insights or takeaways from the article. Return as a JSON array of strings.'

    const session = await sessionManager.getSession({
      type: 'languageModel',
      options: {
        systemPrompt,
        temperature: 0.5,
        topK: 3
      }
    }) as LanguageModelSession

    const result = await sendPrompt(session, content)

    try {
      return JSON.parse(result)
    } catch {
      return []
    }
  } catch (error) {
    console.error('Key insights extraction error:', error)
    return []
  }
  // Session manager handles cleanup automatically
}
