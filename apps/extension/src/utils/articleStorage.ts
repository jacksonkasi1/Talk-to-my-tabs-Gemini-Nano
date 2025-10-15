// apps/extension/src/utils/articleStorage.ts
// ** import types
import type { Article } from '@/types/article'

export const saveArticleToStorage = async (article: Article): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['articles'], (result) => {
      const articles = result.articles || []
      
      // Ensure savedAt is stored as ISO string
      const articleToSave = {
        ...article,
        savedAt: typeof article.savedAt === 'string' 
          ? article.savedAt 
          : article.savedAt.toISOString()
      }
      
      articles.unshift(articleToSave)
      
      // Keep only last 100 articles to manage storage
      const trimmedArticles = articles.slice(0, 100)
      
      chrome.storage.local.set({ articles: trimmedArticles }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  })
}

export const getArticlesFromStorage = async (): Promise<Article[]> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['articles'], (result) => {
      const articles = result.articles || []
      // Keep dates as strings - they'll be parsed when needed
      resolve(articles)
    })
  })
}

export const updateArticleInStorage = async (articleId: string, updates: Partial<Article>): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['articles'], (result) => {
      const articles = result.articles || []
      const updatedArticles = articles.map((article: Article) =>
        article.id === articleId ? { ...article, ...updates } : article
      )
      
      chrome.storage.local.set({ articles: updatedArticles }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  })
}

export const deleteArticleFromStorage = async (articleId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['articles'], (result) => {
      const articles = result.articles || []
      const filteredArticles = articles.filter((article: Article) => article.id !== articleId)
      
      chrome.storage.local.set({ articles: filteredArticles }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  })
}