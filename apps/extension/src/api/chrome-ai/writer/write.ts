export const write = async (
  writer: WriterSession,
  prompt: string,
  context?: string
): Promise<string> => {
  try {
    const result = await writer.write(prompt, { context })
    return result
  } catch (error) {
    console.error('Failed to write:', error)
    throw error
  }
}
