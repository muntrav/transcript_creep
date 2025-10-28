'use client'

import React, { useState } from 'react'
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  SettingsBrightness as SystemModeIcon,
  Check as CheckIcon,
} from '@mui/icons-material'
import { useThemeMode } from '@/app/providers'

export default function ThemeToggle() {
  const { mode, setMode, actualTheme } = useThemeMode()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleModeSelect = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode)
    handleClose()
  }

  // Icon to display based on actual theme
  const ThemeIcon = actualTheme === 'dark' ? DarkModeIcon : LightModeIcon

  return (
    <>
      <IconButton
        onClick={handleClick}
        aria-label="theme settings"
        aria-controls={open ? 'theme-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        color="inherit"
        sx={{
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'rotate(180deg)',
          },
        }}
      >
        <ThemeIcon />
      </IconButton>

      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            minWidth: 180,
            mt: 1,
          },
        }}
      >
        <MenuItem onClick={() => handleModeSelect('light')}>
          <ListItemIcon>
            <LightModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Light</ListItemText>
          {mode === 'light' && (
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
          )}
        </MenuItem>

        <MenuItem onClick={() => handleModeSelect('dark')}>
          <ListItemIcon>
            <DarkModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Dark</ListItemText>
          {mode === 'dark' && (
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
          )}
        </MenuItem>

        <MenuItem onClick={() => handleModeSelect('system')}>
          <ListItemIcon>
            <SystemModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>System</ListItemText>
          {mode === 'system' && (
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
          )}
        </MenuItem>
      </Menu>
    </>
  )
}
