// SearchBar.tsx

// ** import types
import type { FC } from "react"

// ** import core packages
import React, { forwardRef } from "react"
import { Search, X } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFocus?: () => void
  onBlur?: () => void
  isFocused?: boolean
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, placeholder = "Search articles...", onFocus, onBlur, isFocused }, ref) => {
    
    const handleClear = () => {
      onChange("")
      if (ref && 'current' in ref) {
        ref.current?.focus()
      }
    }

    return (
      <div className="relative flex items-center">
        <Search
          className="absolute left-0 w-4 h-4 transition-all duration-300 ease-out pointer-events-none"
          style={{ 
            color: isFocused ? 'var(--text-primary)' : 'var(--text-tertiary)' 
          }}
        />
        
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full pl-6 pr-8 py-2 text-sm bg-transparent outline-none transition-all duration-300"
          style={{
            borderBottom: isFocused
              ? '1px solid var(--text-primary)'
              : '1px solid var(--divider)',
            color: 'var(--text-primary)'
          }}
        />
        
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-0 p-1 rounded-full transition-all duration-200 hover:bg-hover-subtle"
            type="button"
          >
            <X 
              className="w-3.5 h-3.5" 
              style={{ color: 'var(--text-tertiary)' }} 
            />
          </button>
        )}
      </div>
    )
  }
)

SearchBar.displayName = 'SearchBar'

export default SearchBar