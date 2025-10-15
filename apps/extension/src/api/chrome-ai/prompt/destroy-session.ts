export const destroySession = (session: LanguageModelSession): void => {
  try {
    session.destroy()
  } catch (error) {
    console.error('Failed to destroy session:', error)
  }
}
