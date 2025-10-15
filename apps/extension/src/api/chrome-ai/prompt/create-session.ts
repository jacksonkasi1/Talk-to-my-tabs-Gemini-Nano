import type { PromptOptions, MonitorOptions } from '../types'

export const createPromptSession = async (
  options?: PromptOptions & MonitorOptions
): Promise<LanguageModelSession> => {
  if (!('LanguageModel' in self)) {
    throw new Error('Prompt API not available')
  }

  try {
    const session = await LanguageModel.create({
      systemPrompt: options?.systemPrompt,
      temperature: options?.temperature ?? 0.7,
      topK: options?.topK ?? 3,
      monitor: options?.monitor
    })

    return session
  } catch (error) {
    console.error('Failed to create Prompt API session:', error)
    throw error
  }
}
