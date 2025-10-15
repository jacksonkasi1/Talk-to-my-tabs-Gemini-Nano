export const cloneSession = async (
  session: LanguageModelSession
): Promise<LanguageModelSession> => {
  try {
    const clonedSession = await session.clone()
    return clonedSession
  } catch (error) {
    console.error('Failed to clone session:', error)
    throw error
  }
}
