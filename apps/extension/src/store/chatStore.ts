// apps/extension/src/store/chatStore.ts
// ** import types
import type { PageContent } from '@/utils/contentExtractor'

// ** import core packages
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  isError?: boolean
}

export interface ChatSession {
  domain: string
  url: string
  title: string
  messages: Message[]
  pageContent: PageContent | null
  createdAt: Date
  lastActiveAt: Date
}

interface ChatStore {
  // Current active session
  currentDomain: string | null
  currentSession: ChatSession | null
  
  // All sessions by domain
  sessions: Record<string, ChatSession>
  
  // UI state
  isLoadingContent: boolean
  isLoadingMessage: boolean
  showNewChatButton: boolean
  showContentWarning: boolean
  pendingContent: PageContent | null
  
  // Actions
  setCurrentDomain: (domain: string | null) => void
  createSession: (domain: string, url: string, title: string, pageContent: PageContent) => void
  updateSession: (domain: string, updates: Partial<ChatSession>) => void
  addMessage: (domain: string, message: Message) => void
  loadSession: (domain: string) => void
  clearSession: (domain: string) => void
  clearCurrentSession: () => void
  clearAllSessions: () => void
  setLoadingContent: (loading: boolean) => void
  setLoadingMessage: (loading: boolean) => void
  setShowNewChatButton: (show: boolean) => void
  setShowContentWarning: (show: boolean) => void
  setPendingContent: (content: PageContent | null) => void
  getSessionByDomain: (domain: string) => ChatSession | null
  hasSessionForDomain: (domain: string) => boolean
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentDomain: null,
      currentSession: null,
      sessions: {},
      isLoadingContent: false,
      isLoadingMessage: false,
      showNewChatButton: false,
      showContentWarning: false,
      pendingContent: null,
      
      // Actions
      setCurrentDomain: (domain) => set({ 
        currentDomain: domain,
        currentSession: domain ? get().sessions[domain] || null : null
      }),
      
      createSession: (domain, url, title, pageContent) => {
        const newSession: ChatSession = {
          domain,
          url,
          title,
          messages: [
            {
              id: `welcome-${Date.now()}`,
              text: `I'm ready to help you with "${title}". What would you like to know about this article?`,
              isUser: false,
              timestamp: new Date()
            }
          ],
          pageContent,
          createdAt: new Date(),
          lastActiveAt: new Date()
        }
        
        set((state) => ({
          sessions: {
            ...state.sessions,
            [domain]: newSession
          },
          currentDomain: domain,
          currentSession: newSession,
          showNewChatButton: false
        }))
      },
      
      updateSession: (domain, updates) => {
        set((state) => {
          const existingSession = state.sessions[domain]
          if (!existingSession) return state
          
          const updatedSession = {
            ...existingSession,
            ...updates,
            lastActiveAt: new Date()
          }
          
          return {
            sessions: {
              ...state.sessions,
              [domain]: updatedSession
            },
            currentSession: state.currentDomain === domain ? updatedSession : state.currentSession
          }
        })
      },
      
      addMessage: (domain, message) => {
        set((state) => {
          const session = state.sessions[domain]
          if (!session) return state
          
          const updatedSession = {
            ...session,
            messages: [...session.messages, message],
            lastActiveAt: new Date()
          }
          
          return {
            sessions: {
              ...state.sessions,
              [domain]: updatedSession
            },
            currentSession: state.currentDomain === domain ? updatedSession : state.currentSession,
            // Don't change showNewChatButton when adding messages
            showNewChatButton: state.showNewChatButton
          }
        })
      },
      
      loadSession: (domain) => {
        const session = get().sessions[domain]
        if (session) {
          set({
            currentDomain: domain,
            currentSession: session
          })
        }
      },
      
      clearSession: (domain) => {
        set((state) => {
          const { [domain]: removed, ...remainingSessions } = state.sessions
          const isCurrentSession = state.currentDomain === domain
          
          return {
            sessions: remainingSessions,
            currentDomain: isCurrentSession ? null : state.currentDomain,
            currentSession: isCurrentSession ? null : state.currentSession,
            showNewChatButton: false
          }
        })
      },
      
      clearCurrentSession: () => set({
        currentDomain: null,
        currentSession: null,
        showNewChatButton: false
      }),
      
      clearAllSessions: () => set({
        sessions: {},
        currentDomain: null,
        currentSession: null,
        showNewChatButton: false
      }),
      
      setLoadingContent: (loading) => set({ isLoadingContent: loading }),
      setLoadingMessage: (loading) => set({ isLoadingMessage: loading }),
      setShowContentWarning: (show) => set({ showContentWarning: show }),
      setPendingContent: (content) => set({ pendingContent: content }),
      setShowNewChatButton: (show) => set((state) => {
        // Only update if the value actually changes
        if (state.showNewChatButton !== show) {
          return { showNewChatButton: show }
        }
        return state
      }),
      
      getSessionByDomain: (domain) => get().sessions[domain] || null,
      hasSessionForDomain: (domain) => !!get().sessions[domain]
    }),
    {
      name: 'talktomytabs-chat-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const data = JSON.parse(str)
          // Convert date strings back to Date objects
          if (data.state?.sessions) {
            Object.values(data.state.sessions).forEach((session: any) => {
              session.createdAt = new Date(session.createdAt)
              session.lastActiveAt = new Date(session.lastActiveAt)
              session.messages.forEach((msg: any) => {
                msg.timestamp = new Date(msg.timestamp)
              })
            })
          }
          return data
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          localStorage.removeItem(name)
        }
      })),
      partialize: (state) => ({
        sessions: state.sessions,
        currentDomain: state.currentDomain
      })
    }
  )
)