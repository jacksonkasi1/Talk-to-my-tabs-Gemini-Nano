// apps/extension/src/types/index.ts
export * from './article'

export interface ChromeMessage {
  action: string
  data?: any
}

export interface ChromeResponse {
  success?: boolean
  error?: string
  data?: any
}