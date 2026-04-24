'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import type { ManualPaymentConfig } from '@/types/billing'

export default function ManualPaymentGuide({ config }: { config: ManualPaymentConfig }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Payment instructions
            </Typography>
            <Chip label="Manual review" size="small" color="warning" />
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {config.destinationLabel}
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              {revealed ? config.destinationValue : config.maskedDestinationValue}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              The full payment destination is hidden by default and only shown when requested.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" onClick={() => setRevealed((current) => !current)}>
              {revealed ? 'Hide full details' : 'Show full details'}
            </Button>
            <Button
              variant="text"
              onClick={() => navigator.clipboard.writeText(config.destinationValue)}
            >
              Copy
            </Button>
          </Stack>

          {config.contactChannel && config.contactValue ? (
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Confirmation channel
              </Typography>
              <Typography variant="body1">
                {config.contactChannel}: {config.contactValue}
              </Typography>
            </Stack>
          ) : null}

          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Before you submit a request
            </Typography>
            {config.notes.length ? (
              config.notes.map((note) => (
                <Typography key={note} variant="body2">
                  • {note}
                </Typography>
              ))
            ) : (
              <>
                <Typography variant="body2">• Send payment first.</Typography>
                <Typography variant="body2">
                  • Keep the transfer reference exactly as it appears on the receipt.
                </Typography>
                <Typography variant="body2">
                  • Submit one request per plan change so admin review stays clear.
                </Typography>
              </>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
