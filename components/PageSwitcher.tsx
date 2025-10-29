'use client'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { usePathname, useRouter } from 'next/navigation'

export default function PageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const value = pathname === '/shorts' ? 'shorts' : 'videos'

  const pillSx = {
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    '& .MuiToggleButtonGroup-grouped': {
      border: 0,
      px: 2,
      color: 'white',
      '&.Mui-selected': { color: 'primary.main', backgroundColor: 'white' },
      '&:not(:first-of-type)': { borderRadius: '9999px' },
      '&:first-of-type': { borderRadius: '9999px' },
    },
  } as const

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_e, v) => {
        if (!v) return
        router.push(v === 'shorts' ? '/shorts' : '/')
      }}
      sx={{ ...pillSx, maxWidth: 280 }}
    >
      <ToggleButton value="videos">Videos</ToggleButton>
      <ToggleButton value="shorts">Shorts</ToggleButton>
    </ToggleButtonGroup>
  )
}
