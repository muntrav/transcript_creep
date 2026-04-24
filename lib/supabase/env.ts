function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!value) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }
  return value
}

export function getSupabasePublishableKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!value) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }
  return value
}

export function getSupabaseServiceRoleKey() {
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

function splitLines(value?: string | null) {
  return (value || '')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function maskSensitiveValue(value: string) {
  const compact = value.replace(/\s+/g, '')
  const digitsOnly = compact.replace(/\D/g, '')

  if (digitsOnly.length >= 12) {
    return `•••• •••• •••• ${digitsOnly.slice(-4)}`
  }

  if (compact.length > 8) {
    return `${compact.slice(0, 2)}••••${compact.slice(-4)}`
  }

  return compact
}

export function getManualPaymentConfig() {
  const destinationValue =
    process.env.MANUAL_PAYMENT_DESTINATION_VALUE?.trim() ||
    'Configure MANUAL_PAYMENT_DESTINATION_VALUE'

  return {
    destinationLabel: process.env.MANUAL_PAYMENT_DESTINATION_LABEL?.trim() || 'Payment destination',
    destinationValue,
    maskedDestinationValue: maskSensitiveValue(destinationValue),
    contactChannel: process.env.MANUAL_PAYMENT_CONTACT_CHANNEL?.trim() || null,
    contactValue: process.env.MANUAL_PAYMENT_CONTACT_VALUE?.trim() || null,
    notes: splitLines(process.env.MANUAL_PAYMENT_NOTES),
  }
}

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null
}

export function getTurnstileSecretKey() {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || null
}
