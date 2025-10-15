// ** import core packages
import { useEffect, RefObject } from "react"

interface UseKeyboardShortcutsProps {
  searchInputRef: RefObject<HTMLInputElement | null>
  showHelp: boolean
  onToggleHelp: () => void
}

export const useKeyboardShortcuts = ({ 
  searchInputRef, 
  showHelp, 
  onToggleHelp 
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === '?') {
        onToggleHelp()
      } else if (e.key === 'Escape' && showHelp) {
        onToggleHelp()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [searchInputRef, showHelp, onToggleHelp])
}