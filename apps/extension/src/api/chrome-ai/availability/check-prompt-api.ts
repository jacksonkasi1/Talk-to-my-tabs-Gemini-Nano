import type { AIAvailability } from '../types'

export const checkPromptApiAvailability = async (): Promise<AIAvailability> => {
  try {
    if (!('LanguageModel' in self)) {
      return 'unavailable'
    }

    const availability = await LanguageModel.availability()
    return availability
  } catch (error) {
    console.error('Failed to check Prompt API availability:', error)
    return 'unavailable'
  }
}
