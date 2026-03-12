// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: [] })

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error || !data) return NextResponse.json({ data: [] })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: body.name,
      product_name: body.productName,
      product_notes: body.productNotes,
      style_pack_id: body.stylePackId || null,
      match_example_id: body.matchExampleId || null,
      sales_intensity: body.salesIntensity ?? 2,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
