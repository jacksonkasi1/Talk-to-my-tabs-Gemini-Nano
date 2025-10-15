// ThemeToggle.tsx

// ** import types
import type { FC } from "react"

// ** import icons
import { Sun, Moon } from "lucide-react"

interface ThemeToggleProps {
  theme: "light" | "dark"
  onToggleTheme: () => void
  bottom?: string
}

const ThemeToggle: FC<ThemeToggleProps> = ({ theme, onToggleTheme, bottom = "136px" }) => {
  return (
    <button
      onClick={onToggleTheme}
      className={`fixed right-6  w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all duration-200 hover:shadow-md`}
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--divider)',
        color: 'var(--text-primary)',
        zIndex: 40,
        bottom
      }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
    </button>
  )
}

export default ThemeToggle