import { checkPromptApiAvailability } from '@/api/chrome-ai/availability'
import type { AIAvailability } from '@/api/chrome-ai/types'

export interface ChromeAIStatus {
  available: boolean
  availability: AIAvailability
  message: string
}

export const checkChromeAI = async (): Promise<ChromeAIStatus> => {
  try {
    const availability = await checkPromptApiAvailability()

    switch (availability) {
      case 'available':
        return {
          available: true,
          availability,
          message: 'Chrome AI is ready'
        }

      case 'downloadable':
        return {
          available: false,
          availability,
          message: 'Chrome AI model needs to be downloaded. Please interact with the page to start download.'
        }

      case 'downloading':
        return {
          available: false,
          availability,
          message: 'Chrome AI model is downloading. Please wait...'
        }

      case 'unavailable':
      default:
        return {
          available: false,
          availability: 'unavailable',
          message: 'Chrome AI is not available. Please use Chrome Canary 138+ with Built-in AI flags enabled.'
        }
    }
  } catch (error) {
    console.error('Failed to check Chrome AI:', error)
    return {
      available: false,
      availability: 'unavailable',
      message: 'Chrome AI is not available. Please use Chrome Canary 138+ with Built-in AI flags enabled.'
    }
  }
}

export const getSetupInstructions = (): string[] => {
  return [
    '1. Download Chrome Canary from google.com/chrome/canary',
    '2. Enable flags:',
    '   - chrome://flags/#prompt-api-for-gemini-nano',
    '   - chrome://flags/#optimization-guide-on-device-model',
    '3. Download AI model at chrome://components',
    '4. Restart Chrome and try again'
  ]
}
