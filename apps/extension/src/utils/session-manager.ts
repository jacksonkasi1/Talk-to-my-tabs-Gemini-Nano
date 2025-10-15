/**
 * Session Manager for Chrome AI APIs
 * 
 * Based on official Chrome AI best practices:
 * https://developer.chrome.com/docs/ai/session-management
 * 
 * KEY PRINCIPLES:
 * 1. Reuse sessions instead of creating new ones (prevents memory exhaustion)
 * 2. Properly destroy sessions when done (prevents GPU crashes)
 * 3. Rate limit session creation (prevents system overload)
 * 4. Support AbortController for user cancellation
 */

interface SessionConfig {
  type: 'summarizer' | 'languageModel'
  options?: any
}

interface ManagedSession {
  session: SummarizerSession | LanguageModelSession
  type: string
  createdAt: number
  lastUsedAt: number
  useCount: number
}

class AISessionManager {
  private sessions: Map<string, ManagedSession> = new Map()
  private creationQueue: Promise<any> = Promise.resolve()
  private lastCreationTime: number = 0
  private readonly MIN_CREATION_INTERVAL = 1000 // 1 second between session creations
  private readonly MAX_SESSIONS = 3 // Maximum concurrent sessions
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  /**
   * Get or create a session with proper rate limiting
   */
  async getSession(config: SessionConfig): Promise<SummarizerSession | LanguageModelSession> {
    const sessionKey = `${config.type}-${JSON.stringify(config.options || {})}`

    // Check if we have an existing session
    const existing = this.sessions.get(sessionKey)
    if (existing) {
      existing.lastUsedAt = Date.now()
      existing.useCount++
      console.log(`✅ Reusing ${config.type} session (used ${existing.useCount} times)`)
      return existing.session
    }

    // Clean up old sessions before creating new one
    await this.cleanup()

    // Enforce maximum session limit
    if (this.sessions.size >= this.MAX_SESSIONS) {
      console.warn('⚠️ Maximum sessions reached, cleaning up oldest session')
      await this.destroyOldestSession()
    }

    // Rate limit session creation (CRITICAL for preventing crashes)
    const timeSinceLastCreation = Date.now() - this.lastCreationTime
    if (timeSinceLastCreation < this.MIN_CREATION_INTERVAL) {
      const waitTime = this.MIN_CREATION_INTERVAL - timeSinceLastCreation
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before creating session`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    // Create session with proper error handling
    try {
      console.log(`🔄 Creating new ${config.type} session...`)
      const session = await this.createSessionInternal(config)
      this.lastCreationTime = Date.now()

      // Store session
      this.sessions.set(sessionKey, {
        session,
        type: config.type,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        useCount: 1
      })

      console.log(`✅ Created ${config.type} session successfully`)
      return session
    } catch (error) {
      console.error(`❌ Failed to create ${config.type} session:`, error)
      throw error
    }
  }

  /**
   * Create a session internally based on type
   */
  private async createSessionInternal(config: SessionConfig): Promise<any> {
    switch (config.type) {
      case 'summarizer':
        return await this.createSummarizerWithRetry(config.options)
      case 'languageModel':
        return await this.createLanguageModelWithRetry(config.options)
      default:
        throw new Error(`Unknown session type: ${config.type}`)
    }
  }

  /**
   * Create summarizer with timeout and retry logic
   */
  private async createSummarizerWithRetry(options: any, retries = 2): Promise<SummarizerSession> {
    for (let i = 0; i <= retries; i++) {
      try {
        // Check availability first
        if (!('Summarizer' in self)) {
          throw new Error('Summarizer API not available')
        }

        const availability = await Promise.race([
          Summarizer.availability(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Availability check timeout')), 5000)
          )
        ])

        if (availability !== 'available') {
          throw new Error(`Summarizer not available: ${availability}`)
        }

        // Create session with timeout
        const session = await Promise.race([
          Summarizer.create(options || {
            type: 'key-points',
            format: 'markdown',
            length: 'medium'
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Session creation timeout')), 15000)
          )
        ])

        return session
      } catch (error) {
        if (i === retries) throw error
        console.warn(`Retry ${i + 1}/${retries} after error:`, error)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    throw new Error('Failed to create summarizer after retries')
  }

  /**
   * Create language model with timeout and retry logic
   */
  private async createLanguageModelWithRetry(options: any, retries = 2): Promise<LanguageModelSession> {
    for (let i = 0; i <= retries; i++) {
      try {
        if (!('LanguageModel' in self)) {
          throw new Error('LanguageModel API not available')
        }

        const availability = await Promise.race([
          LanguageModel.availability(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Availability check timeout')), 5000)
          )
        ])

        if (availability !== 'available') {
          throw new Error(`LanguageModel not available: ${availability}`)
        }

        const session = await Promise.race([
          LanguageModel.create(options || {
            temperature: 0.7,
            topK: 3
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Session creation timeout')), 15000)
          )
        ])

        return session
      } catch (error) {
        if (i === retries) throw error
        console.warn(`Retry ${i + 1}/${retries} after error:`, error)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    throw new Error('Failed to create language model after retries')
  }

  /**
   * Destroy a specific session
   */
  async destroySession(config: SessionConfig): Promise<void> {
    const sessionKey = `${config.type}-${JSON.stringify(config.options || {})}`
    const managed = this.sessions.get(sessionKey)

    if (managed) {
      try {
        console.log(`🗑️ Destroying ${config.type} session`)
        // Add delay before destroy to prevent crashes
        await new Promise(resolve => setTimeout(resolve, 200))
        managed.session.destroy()
        this.sessions.delete(sessionKey)
        console.log(`✅ Destroyed ${config.type} session`)
      } catch (error) {
        console.error(`⚠️ Error destroying session:`, error)
        this.sessions.delete(sessionKey) // Remove anyway
      }
    }
  }

  /**
   * Destroy the oldest session to free up resources
   */
  private async destroyOldestSession(): Promise<void> {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, session] of this.sessions) {
      if (session.lastUsedAt < oldestTime) {
        oldestTime = session.lastUsedAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      const session = this.sessions.get(oldestKey)!
      try {
        await new Promise(resolve => setTimeout(resolve, 200))
        session.session.destroy()
        this.sessions.delete(oldestKey)
        console.log(`♻️ Destroyed oldest session (${session.type})`)
      } catch (error) {
        console.error('Error destroying oldest session:', error)
        this.sessions.delete(oldestKey)
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanup(): Promise<void> {
    const now = Date.now()
    const toDestroy: string[] = []

    for (const [key, session] of this.sessions) {
      if (now - session.lastUsedAt > this.SESSION_TIMEOUT) {
        toDestroy.push(key)
      }
    }

    for (const key of toDestroy) {
      const session = this.sessions.get(key)!
      try {
        await new Promise(resolve => setTimeout(resolve, 200))
        session.session.destroy()
        this.sessions.delete(key)
        console.log(`♻️ Cleaned up expired session (${session.type})`)
      } catch (error) {
        console.error('Error cleaning up session:', error)
        this.sessions.delete(key)
      }
    }
  }

  /**
   * Destroy all sessions (call on extension unload)
   */
  async destroyAll(): Promise<void> {
    console.log('🗑️ Destroying all AI sessions...')
    const keys = Array.from(this.sessions.keys())
    
    for (const key of keys) {
      const session = this.sessions.get(key)!
      try {
        await new Promise(resolve => setTimeout(resolve, 200))
        session.session.destroy()
        console.log(`✅ Destroyed ${session.type} session`)
      } catch (error) {
        console.error('Error destroying session:', error)
      }
    }

    this.sessions.clear()
    console.log('✅ All sessions destroyed')
  }

  /**
   * Get current session count
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * Get session stats
   */
  getStats() {
    const stats: any[] = []
    for (const [key, session] of this.sessions) {
      stats.push({
        type: session.type,
        age: Math.floor((Date.now() - session.createdAt) / 1000),
        lastUsed: Math.floor((Date.now() - session.lastUsedAt) / 1000),
        useCount: session.useCount
      })
    }
    return stats
  }
}

// Export singleton instance
export const sessionManager = new AISessionManager()

// Clean up on extension unload
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onSuspend?.addListener(async () => {
    console.log('🔄 Extension suspending, cleaning up AI sessions...')
    await sessionManager.destroyAll()
  })
}
