import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType } = await req.json()
    if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL not set' }, { status: 503 })
    if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 503 })

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `uploads/${Date.now()}_${safeName}`

    // Try signed upload URL
    const signRes = await fetch(
      `${supabaseUrl}/storage/v1/object/upload/sign/raw-footage/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    )

    const signText = await signRes.text()
    console.log('Supabase sign URL response:', signRes.status, signText)

    if (signRes.ok) {
      const data = JSON.parse(signText)
      const signedUrl = data.signedURL
        ? (data.signedURL.startsWith('http') ? data.signedURL : `${supabaseUrl}${data.signedURL}`)
        : null

      if (signedUrl) {
        return NextResponse.json({
          signedUrl,
          publicUrl: `${supabaseUrl}/storage/v1/object/public/raw-footage/${path}`,
          path,
        })
      }
    }

    // Signed URL failed — return the exact error so the client can show it
    return NextResponse.json({
      error: `Supabase signed URL failed (${signRes.status}): ${signText}`,
    }, { status: 502 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
