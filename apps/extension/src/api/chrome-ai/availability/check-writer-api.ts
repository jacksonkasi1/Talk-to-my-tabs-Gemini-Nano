import type { AIAvailability } from '../types'

export const checkWriterApiAvailability = async (): Promise<AIAvailability> => {
  try {
    if (!('Writer' in self)) {
      return 'unavailable'
    }

    const availability = await Writer.availability()
    return availability
  } catch (error) {
    console.error('Failed to check Writer API availability:', error)
    return 'unavailable'
  }
}
