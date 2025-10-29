import { createTheme, ThemeOptions } from '@mui/material/styles'

// Brand palette (from provided spec)
//  - Primary accent: #59B9C7 (aqua / teal)
//  - Light background: #D2DEE3 (light grey-blue)
//  - Dark background: #2B313F (slate)
const colorPalette = {
  primary: '#59B9C7',
  lightBg: '#D2DEE3',
  darkBg: '#2B313F',
  white: '#FFFFFF',
  black: '#000000',
}

// Light theme configuration
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: colorPalette.primary,
      light: '#7fd0d9',
      dark: '#3b8f9a',
      contrastText: colorPalette.darkBg,
    },
    secondary: {
      main: colorPalette.darkBg,
      light: '#3c4458',
      dark: '#202531',
      contrastText: colorPalette.white,
    },
    background: {
      default: colorPalette.lightBg,
      paper: colorPalette.white,
    },
    text: {
      primary: colorPalette.darkBg,
      secondary: '#4a5568',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: colorPalette.primary,
    },
    success: {
      main: '#2e7d32',
    },
  },
  typography: {
    // If "Graphic Garden" is available as a webfont or locally, it will be used.
    // Otherwise we fall back to Geist Sans / system fonts.
    fontFamily:
      '"Graphic Garden", var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(43, 49, 63, 0.08)',
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(43, 49, 63, 0.14)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(43, 49, 63, 0.18)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
}

// Dark theme configuration
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: colorPalette.primary,
      light: '#7fd0d9',
      dark: '#3b8f9a',
      contrastText: colorPalette.darkBg,
    },
    secondary: {
      main: colorPalette.lightBg,
      light: '#e3eaee',
      dark: '#aab7bf',
      contrastText: colorPalette.darkBg,
    },
    background: {
      default: colorPalette.darkBg,
      paper: '#232836',
    },
    text: {
      primary: colorPalette.lightBg,
      secondary: '#9fb3bf',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: colorPalette.primary,
    },
    success: {
      main: '#66bb6a',
    },
  },
  typography: {
    fontFamily:
      '"Graphic Garden", var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
}

export const lightTheme = createTheme(lightThemeOptions)
export const darkTheme = createTheme(darkThemeOptions)

export { colorPalette }
