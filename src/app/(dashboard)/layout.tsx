// src/app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const supabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')
  )

  // Only enforce auth if Supabase is actually configured
  if (supabaseConfigured && !user) redirect('/sign-in')

  const displayName = user?.user_metadata?.name || user?.email || 'Creator'
  const displayEmail = user?.email || 'demo@clipforge.ai'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={{ name: displayName, email: displayEmail }} />
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
