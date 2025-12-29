import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function GlobalThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-8 right-8 z-[9999] p-4 rounded-full bg-primary text-black shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:scale-110 active:scale-90 transition-all duration-200 flex items-center justify-center border-2 border-black dark:border-white"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={28} className="fill-current" />
      ) : (
        <Moon size={28} className="fill-current" />
      )}
    </button>
  )
}
