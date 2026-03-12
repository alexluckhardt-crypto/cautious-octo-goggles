// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || !url.startsWith('https://')) {
    // Return mock client
    return {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => ({ data: null, error: 'not configured' }) }) }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: 'not configured' }) }) }),
        update: () => ({ eq: () => ({ data: null, error: 'not configured' }) }),
      }),
    } as any
  }

  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}
