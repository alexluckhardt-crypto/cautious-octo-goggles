import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: [] })
    const { data, error } = await supabase
      .from('style_packs').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ data: [] })
    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const name = formData.get('name') as string
    const description = (formData.get('description') as string) || ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: inserted, error } = await supabase
      .from('style_packs')
      .insert({ name, description, user_id: user.id, status: 'draft', example_count: 0 })
      .select().single()

    if (error || !inserted) {
      return NextResponse.json({ error: error?.message || 'Failed to create style pack' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: inserted }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
