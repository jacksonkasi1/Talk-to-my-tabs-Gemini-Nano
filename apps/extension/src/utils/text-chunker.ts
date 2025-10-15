export interface ChunkOptions {
  maxChunkSize?: number
  overlap?: number
}

const DEFAULT_CHUNK_SIZE = 4000
const DEFAULT_OVERLAP = 200

export const splitIntoChunks = (
  text: string,
  options?: ChunkOptions
): string[] => {
  const maxSize = options?.maxChunkSize ?? DEFAULT_CHUNK_SIZE
  const overlap = options?.overlap ?? DEFAULT_OVERLAP

  if (text.length <= maxSize) {
    return [text]
  }

  const chunks: string[] = []
  let startIndex = 0

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + maxSize, text.length)
    let chunk = text.substring(startIndex, endIndex)

    if (endIndex < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const lastSpace = chunk.lastIndexOf(' ')

      const breakPoint = Math.max(lastPeriod, lastNewline, lastSpace)

      if (breakPoint > maxSize * 0.5) {
        chunk = text.substring(startIndex, startIndex + breakPoint + 1)
        startIndex = startIndex + breakPoint + 1 - overlap
      } else {
        startIndex = endIndex - overlap
      }
    } else {
      startIndex = endIndex
    }

    chunks.push(chunk.trim())
  }

  return chunks
}

export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}
