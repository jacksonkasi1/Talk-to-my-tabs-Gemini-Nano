import type { AIAvailability } from '../types'

export const checkRewriterApiAvailability = async (): Promise<AIAvailability> => {
  try {
    if (!('Rewriter' in self)) {
      return 'unavailable'
    }

    const availability = await Rewriter.availability()
    return availability
  } catch (error) {
    console.error('Failed to check Rewriter API availability:', error)
    return 'unavailable'
  }
}
