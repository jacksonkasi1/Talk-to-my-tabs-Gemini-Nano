export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Blob
  mimeType?: string
}

export interface PromptOptions {
  systemPrompt?: string
  temperature?: number
  topK?: number
}

export interface SummarizerOptions {
  type?: 'key-points' | 'tl;dr' | 'teaser' | 'headline'
  format?: 'markdown' | 'plain-text'
  length?: 'short' | 'medium' | 'long'
  sharedContext?: string
}

export interface WriterOptions {
  tone?: 'formal' | 'neutral' | 'casual'
  format?: 'plain-text' | 'markdown'
  length?: 'short' | 'medium' | 'long'
  sharedContext?: string
}

export interface RewriterOptions {
  tone?: 'as-is' | 'more-formal' | 'more-casual'
  format?: 'as-is' | 'plain-text' | 'markdown'
  length?: 'as-is' | 'shorter' | 'longer'
  sharedContext?: string
}

export type AIAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available'

export interface DownloadMonitor {
  addEventListener(event: 'downloadprogress', listener: (e: { loaded: number; total: number }) => void): void
}

export interface MonitorOptions {
  monitor?: (m: DownloadMonitor) => void
}

declare global {
  interface LanguageModelSession {
    prompt(text: string | ChatMessage[]): Promise<string>
    promptStreaming(text: string | ChatMessage[]): ReadableStream<string>
    clone(): Promise<LanguageModelSession>
    destroy(): void
  }

  interface SummarizerSession {
    summarize(text: string, options?: { context?: string }): Promise<string>
    summarizeStreaming(text: string, options?: { context?: string }): ReadableStream<string>
    destroy(): void
  }

  interface WriterSession {
    write(prompt: string, options?: { context?: string }): Promise<string>
    writeStreaming(prompt: string, options?: { context?: string }): ReadableStream<string>
    destroy(): void
  }

  interface RewriterSession {
    rewrite(text: string, options?: { context?: string }): Promise<string>
    rewriteStreaming(text: string, options?: { context?: string }): ReadableStream<string>
    destroy(): void
  }

  const LanguageModel: {
    availability(): Promise<AIAvailability>
    create(options?: PromptOptions & MonitorOptions): Promise<LanguageModelSession>
  }

  const Summarizer: {
    availability(): Promise<AIAvailability>
    create(options?: SummarizerOptions & MonitorOptions): Promise<SummarizerSession>
  }

  const Writer: {
    availability(): Promise<AIAvailability>
    create(options?: WriterOptions & MonitorOptions): Promise<WriterSession>
  }

  const Rewriter: {
    availability(): Promise<AIAvailability>
    create(options?: RewriterOptions & MonitorOptions): Promise<RewriterSession>
  }
}
