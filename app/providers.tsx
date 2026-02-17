'use client'

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { lightTheme, darkTheme } from './theme'

type ThemeMode = 'light' | 'dark' | 'system'

type ThemeContextType = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  actualTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'transcriptcreep-theme-preference'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Detect system preference
  useEffect(() => {
    setMounted(true)

    // Get saved preference or default to 'system'
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setModeState(savedMode)
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Compute the actual theme based on mode and system preference
  const actualTheme = useMemo(() => {
    if (mode === 'system') {
      return systemPreference
    }
    return mode
  }, [mode, systemPreference])

  // Save preference to localStorage
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newMode)
    }
  }

  // Select the appropriate MUI theme
  const theme = useMemo(() => {
    return actualTheme === 'dark' ? darkTheme : lightTheme
  }, [actualTheme])

  return (
    <ThemeContext.Provider value={{ mode, setMode, actualTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useThemeMode() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeMode must be used within a ThemeProvider')
  }
  return context
}
