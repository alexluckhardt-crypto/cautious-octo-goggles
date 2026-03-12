// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return a dummy client if Supabase isn't configured yet
  if (!url || !key || !url.startsWith('https://')) {
    return null as any
  }

  return createBrowserClient(url, key)
}
