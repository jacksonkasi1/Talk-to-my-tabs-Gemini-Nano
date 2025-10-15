import type { AIAvailability } from '../types'

export const checkSummarizerApiAvailability = async (): Promise<AIAvailability> => {
  try {
    if (!('Summarizer' in self)) {
      return 'unavailable'
    }

    const availability = await Summarizer.availability()
    return availability
  } catch (error) {
    console.error('Failed to check Summarizer API availability:', error)
    return 'unavailable'
  }
}
