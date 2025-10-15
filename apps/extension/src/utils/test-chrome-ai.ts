export interface AITestResult {
  success: boolean
  message: string
  details?: string
}

// Declare LanguageModelSession type if not already available
declare global {
  interface LanguageModelSession {
    prompt(text: string): Promise<string>
    destroy(): void
  }
}

export const testChromeAI = async (): Promise<AITestResult> => {
  let session: LanguageModelSession | null = null
  
  try {
    if (!('LanguageModel' in self)) {
      return {
        success: false,
        message: 'LanguageModel API not found in browser',
        details: 'Make sure you are using Chrome Canary 138+ with Built-in AI flags enabled'
      }
    }

    const status = await Promise.race([
      LanguageModel.availability(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Availability check timeout')), 5000)
      )
    ])
    console.log('AI Status:', status)

    if (status === 'available') {
      console.log('✅ AI is ready!')
      
      // Create session with timeout protection
      session = await Promise.race([
        LanguageModel.create({
          systemPrompt: 'You are a helpful assistant.',
          temperature: 0.7,
          topK: 3
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session creation timeout')), 10000)
        )
      ])
      
      // Send a simple prompt with timeout
      const response = await Promise.race([
        session.prompt('Say hello'),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Prompt timeout')), 10000)
        )
      ])
      
      console.log('AI says:', response)
      
      // Add delay before destroying session to allow proper cleanup
      await new Promise(resolve => setTimeout(resolve, 500))

      return {
        success: true,
        message: 'Chrome AI is working!',
        details: response
      }
    } else {
      return {
        success: false,
        message: `AI Status: ${status}`,
        details: status === 'downloadable' 
          ? 'Model needs to be downloaded. Please interact with the page to start download.'
          : status === 'downloading'
          ? 'Model is currently downloading. Please wait...'
          : 'AI is not available on this device'
      }
    }
  } catch (error) {
    console.error('❌ AI test failed:', error)
    return {
      success: false,
      message: 'AI test failed',
      details: error instanceof Error ? error.message : String(error)
    }
  } finally {
    // Ensure session is destroyed even if an error occurs
    if (session) {
      try {
        // Add delay before cleanup
        await new Promise(resolve => setTimeout(resolve, 200))
        session.destroy()
        console.log('✅ Session cleaned up')
      } catch (cleanupError) {
        console.error('⚠️ Error during session cleanup:', cleanupError)
      }
    }
  }
}
