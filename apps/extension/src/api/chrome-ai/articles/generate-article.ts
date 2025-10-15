import type { PageContent } from '@/utils/contentExtractor'
import { sendPrompt } from '../prompt/send-prompt'
import { sessionManager } from '@/utils/session-manager'

export const generateArticleFromContent = async (
  pageContent: PageContent
): Promise<string> => {
  try {
    const systemPrompt = `You are an expert article writer. Convert the provided webpage content into a well-structured, readable mini article in Markdown format.

Guidelines:
1. Create an engaging title that captures the essence of the content
2. Add a compelling subtitle or brief description
3. Structure the content with proper markdown headings (##, ###)
4. Identify and highlight key points using bullet points or numbered lists
5. Keep the article concise but informative (500-1000 words ideal)
6. Preserve important quotes if any
7. Add a brief conclusion or key takeaway section
8. Format dates properly
9. Include any relevant metadata (author, publication date) if available

Output format should be clean Markdown with:
- Not needed Title
- Not needed Subtitle/description
- Proper sections with ## and ### headings
- Lists for key points
- **Bold** for emphasis
- > Blockquotes for important quotes`

    const userPrompt = `Convert this webpage content into a mini article:

Title: ${pageContent.title}
URL: ${pageContent.url}

Content:
${pageContent.content}

Please create a well-structured, engaging mini article in Markdown format.`

    const session = await sessionManager.getSession({
      type: 'languageModel',
      options: {
        systemPrompt,
        temperature: 0.7,
        topK: 3
      }
    }) as LanguageModelSession

    const result = await sendPrompt(session, userPrompt)
    return result
  } catch (error) {
    console.error('Article generation error:', error)
    throw error
  }
  // Session manager handles cleanup automatically
}
