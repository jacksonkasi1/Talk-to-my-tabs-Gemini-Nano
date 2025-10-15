export const sendPrompt = async (
  session: LanguageModelSession,
  prompt: string
): Promise<string> => {
  try {
    const result = await session.prompt(prompt)
    return result
  } catch (error) {
    console.error('Failed to send prompt:', error)
    throw error
  }
}
