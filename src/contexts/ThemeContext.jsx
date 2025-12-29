// src/contexts/ThemeContext.jsx
// Theme Management Context for Awarjana Creations
// Handles dark/light mode toggle with proper Tailwind CSS integration

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-theme');
      if (saved) {
        return saved;
      }
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'dark'; // Default to dark mode
    }
    return 'dark';
  });

  const [mounted, setMounted] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log(`🎨 [THEME] Theme initialized: ${theme}`);
  }, [theme]);

  // Apply theme changes to document
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }

    const root = document.documentElement;
    const body = document.body;

    // Store theme in localStorage
    localStorage.setItem('app-theme', theme);

    // Set data-theme attribute for CSS selectors
    root.setAttribute('data-theme', theme);

    // Apply dark class to root element for Tailwind
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }

    // Apply theme-specific CSS variables
    if (theme === 'dark') {
      // Dark mode colors
      root.style.setProperty('--background', '0 0% 3%');
      root.style.setProperty('--foreground', '0 0% 98%');
      root.style.setProperty('--card', '0 0% 3%');
      root.style.setProperty('--card-foreground', '0 0% 98%');
      root.style.setProperty('--popover', '0 0% 3%');
      root.style.setProperty('--popover-foreground', '0 0% 98%');
      root.style.setProperty('--primary', '38 92% 50%');
      root.style.setProperty('--primary-foreground', '0 0% 0%');
      root.style.setProperty('--secondary', '0 0% 14%');
      root.style.setProperty('--secondary-foreground', '0 0% 98%');
      root.style.setProperty('--muted', '0 0% 14%');
      root.style.setProperty('--muted-foreground', '0 0% 64%');
      root.style.setProperty('--accent', '38 92% 50%');
      root.style.setProperty('--accent-foreground', '0 0% 0%');
      root.style.setProperty('--destructive', '0 84% 60%');
      root.style.setProperty('--destructive-foreground', '0 0% 98%');
      root.style.setProperty('--border', '0 0% 14%');
      root.style.setProperty('--input', '0 0% 14%');
      root.style.setProperty('--ring', '38 92% 50%');
      root.style.setProperty('--radius', '0.5rem');
    } else {
      // Light mode colors
      root.style.setProperty('--background', '0 0% 100%');
      root.style.setProperty('--foreground', '0 0% 9%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '0 0% 9%');
      root.style.setProperty('--popover', '0 0% 100%');
      root.style.setProperty('--popover-foreground', '0 0% 9%');
      root.style.setProperty('--primary', '38 92% 50%');
      root.style.setProperty('--primary-foreground', '0 0% 0%');
      root.style.setProperty('--secondary', '0 0% 96%');
      root.style.setProperty('--secondary-foreground', '0 0% 9%');
      root.style.setProperty('--muted', '0 0% 96%');
      root.style.setProperty('--muted-foreground', '0 0% 45%');
      root.style.setProperty('--accent', '38 92% 50%');
      root.style.setProperty('--accent-foreground', '0 0% 0%');
      root.style.setProperty('--destructive', '0 84% 60%');
      root.style.setProperty('--destructive-foreground', '0 0% 98%');
      root.style.setProperty('--border', '0 0% 89%');
      root.style.setProperty('--input', '0 0% 89%');
      root.style.setProperty('--ring', '38 92% 50%');
      root.style.setProperty('--radius', '0.5rem');
    }

    console.log(`🎨 [THEME] Applied ${theme} theme to document`);
  }, [theme, mounted]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      console.log(`🎨 [THEME] Toggling from ${prev} to ${newTheme}`);
      return newTheme;
    });
  }, []);

  // Set specific theme
  const setThemeMode = useCallback((newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      console.log(`🎨 [THEME] Setting theme to ${newTheme}`);
      setTheme(newTheme);
    }
  }, []);

  // Get theme icon
  const getThemeIcon = useCallback(() => {
    return theme === 'dark' ? 'sun' : 'moon';
  }, [theme]);

  // Check if dark mode is active
  const isDarkMode = theme === 'dark';

  // Value object
  const value = {
    theme,
    toggleTheme,
    setTheme: setThemeMode,
    setThemeMode,
    getThemeIcon,
    isDarkMode,
    mounted,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
