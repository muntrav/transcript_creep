import { createTheme, ThemeOptions } from '@mui/material/styles'

// Custom color palette based on the teal/green scheme
const colorPalette = {
  darkest: '#051F20', // Darkest teal-black
  darker: '#0B2B26', // Dark teal
  dark: '#163832', // Medium-dark teal
  medium: '#235347', // Medium teal
  light: '#8EB69B', // Light sage green
  lightest: '#DAF1DE', // Lightest mint
  white: '#FFFFFF',
  black: '#000000',
}

// Light theme configuration
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: colorPalette.medium, // #235347
      light: colorPalette.light, // #8EB69B
      dark: colorPalette.dark, // #163832
      contrastText: colorPalette.white,
    },
    secondary: {
      main: colorPalette.light, // #8EB69B
      light: colorPalette.lightest, // #DAF1DE
      dark: colorPalette.medium, // #235347
      contrastText: colorPalette.darkest,
    },
    background: {
      default: colorPalette.lightest, // #DAF1DE
      paper: colorPalette.white,
    },
    text: {
      primary: colorPalette.darkest,
      secondary: colorPalette.dark,
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: colorPalette.medium,
    },
    success: {
      main: colorPalette.dark,
    },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
          boxShadow: '0 2px 8px rgba(5, 31, 32, 0.08)',
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(5, 31, 32, 0.12)',
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
            boxShadow: '0 2px 8px rgba(5, 31, 32, 0.15)',
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
      main: colorPalette.light, // #8EB69B
      light: colorPalette.lightest, // #DAF1DE
      dark: colorPalette.medium, // #235347
      contrastText: colorPalette.darkest,
    },
    secondary: {
      main: colorPalette.medium, // #235347
      light: colorPalette.light, // #8EB69B
      dark: colorPalette.dark, // #163832
      contrastText: colorPalette.white,
    },
    background: {
      default: colorPalette.darkest, // #051F20
      paper: colorPalette.darker, // #0B2B26
    },
    text: {
      primary: colorPalette.lightest,
      secondary: colorPalette.light,
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: colorPalette.light,
    },
    success: {
      main: colorPalette.medium,
    },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
