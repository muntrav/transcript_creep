import { SignupPageClient } from '@/components/SignupPageClient'
import { getTurnstileSiteKey, isTurnstileEnabled } from '@/lib/supabase/env'

export default function SignupPage() {
  const captchaRequired = isTurnstileEnabled()

  return (
    <SignupPageClient
      captchaRequired={captchaRequired}
      siteKey={captchaRequired ? getTurnstileSiteKey() : null}
    />
  )
}
