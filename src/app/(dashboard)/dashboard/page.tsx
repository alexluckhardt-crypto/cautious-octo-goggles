// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { MOCK_STYLE_PACKS, MOCK_PROJECTS } from '@/lib/mockData'
import DashboardClient from '@/components/layout/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch real data if Supabase is configured, else fall back to mock
  let stylePacks = MOCK_STYLE_PACKS
  let projects = MOCK_PROJECTS

  try {
    const { data: sp } = await supabase.from('style_packs').select('*').order('created_at', { ascending: false })
    const { data: proj } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (sp) stylePacks = sp as any
    if (proj) projects = proj as any
  } catch {
    // Supabase not configured — use mock data
  }

  return <DashboardClient stylePacks={stylePacks} projects={projects} />
}
