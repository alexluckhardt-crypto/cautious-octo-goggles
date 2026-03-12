import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { videoUrls, merge } = await req.json()
    if (!videoUrls?.length) return NextResponse.json({ error: 'No video URLs' }, { status: 400 })

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: existingPack } = await supabase
      .from('style_packs').select('*').eq('id', id).eq('user_id', user.id).single()
    if (!existingPack) return NextResponse.json({ error: 'Style pack not found' }, { status: 404 })

    const previousStyleData = existingPack.style_data || null
    const previousCount = previousStyleData?.total_videos_analyzed || 0

    await supabase.from('style_packs').update({ status: 'analyzing' }).eq('id', id)

    const geminiKey = process.env.GEMINI_API_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    const newAnalyses: any[] = []
    const errors: string[] = []

    for (const url of videoUrls.slice(0, 3)) {
      try {
        if (!geminiKey) throw new Error('GEMINI_API_KEY not set in Vercel environment variables')

        // Step 1: Fetch video from Supabase storage
        const videoRes = await fetch(url)
        if (!videoRes.ok) throw new Error(`Cannot fetch video from storage (${videoRes.status}). Is the uploads bucket public?`)
        
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
        if (videoBuffer.length < 1000) throw new Error(`Video file too small (${videoBuffer.length} bytes) — upload may have failed`)

        const mimeType = url.toLowerCase().includes('.mov') ? 'video/quicktime' : 'video/mp4'

        // Step 2: Start resumable upload to Gemini
        const initRes = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
          {
            method: 'POST',
            headers: {
              'X-Goog-Upload-Protocol': 'resumable',
              'X-Goog-Upload-Command': 'start',
              'X-Goog-Upload-Header-Content-Length': videoBuffer.length.toString(),
              'X-Goog-Upload-Header-Content-Type': mimeType,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file: { display_name: `style-${Date.now()}` } }),
          }
        )
        if (!initRes.ok) {
          const errText = await initRes.text()
          throw new Error(`Gemini upload init failed (${initRes.status}): ${errText.slice(0, 200)}`)
        }
        const uploadUrl = initRes.headers.get('x-goog-upload-url')
        if (!uploadUrl) throw new Error('Gemini did not return an upload URL')

        // Step 3: Upload video bytes
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Length': videoBuffer.length.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize',
          },
          body: new Uint8Array(videoBuffer),
        })
        if (!uploadRes.ok) {
          const errText = await uploadRes.text()
          throw new Error(`Gemini video upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`)
        }
        const fileData = await uploadRes.json()
        const fileUri = fileData.file?.uri
        if (!fileUri) throw new Error(`Gemini upload response missing file URI: ${JSON.stringify(fileData).slice(0, 200)}`)

        // Step 4: Wait for file to be ACTIVE (poll up to 45s)
        let ready = false
        let lastState = 'unknown'
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 3000))
          const check = await fetch(`${fileUri}?key=${geminiKey}`)
          const checkData = await check.json()
          lastState = checkData.state || 'unknown'
          if (lastState === 'ACTIVE') { ready = true; break }
          if (lastState === 'FAILED') break
        }
        if (!ready) throw new Error(`Gemini file processing timed out or failed (state: ${lastState})`)

        // Step 5: Analyze style — try models in order until one works
        const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash']
        const stylePrompt = `Analyze this TikTok Shop video's editing style. Return ONLY a valid JSON object, no other text:
{
  "cuts_per_30s": 8,
  "urgency_score": 70,
  "authenticity_score": 75,
  "confidence_score": 80,
  "pace": "fast",
  "caption_style": "bold",
  "tags": ["tag1", "tag2", "tag3"],
  "notes": "one sentence about the style"
}`
        const styleBody = JSON.stringify({
          contents: [{ parts: [{ file_data: { mime_type: mimeType, file_uri: fileUri } }, { text: stylePrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        })
        let analysisRes: Response | null = null
        let lastErrText = ''
        for (const model of GEMINI_MODELS) {
          const attempt = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: styleBody }
          )
          if (attempt.ok) { analysisRes = attempt; break }
          lastErrText = await attempt.text()
          if (attempt.status !== 404) break
        }
        if (!analysisRes) throw new Error(`Gemini analyze failed: ${lastErrText}`)
        const aData = await analysisRes.json()
        if (!analysisRes.ok) throw new Error(`Gemini analyze failed (${analysisRes.status}): ${JSON.stringify(aData).slice(0, 200)}`)

        const rawText = aData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const finishReason = aData.candidates?.[0]?.finishReason

        if (!rawText) throw new Error(`Gemini returned empty analysis (finishReason: ${finishReason})`)

        // Parse JSON - be very lenient
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            newAnalyses.push(JSON.parse(jsonMatch[0]))
          } catch {
            newAnalyses.push({ cuts_per_30s: 8, urgency_score: 65, authenticity_score: 72, confidence_score: 70, pace: 'fast', caption_style: 'bold', tags: ['Energetic', 'Fast', 'Authentic'], notes: rawText.slice(0, 150) })
          }
        } else {
          newAnalyses.push({ cuts_per_30s: 8, urgency_score: 65, authenticity_score: 72, confidence_score: 70, pace: 'fast', caption_style: 'bold', tags: ['Energetic', 'Fast', 'Authentic'], notes: rawText.slice(0, 150) })
        }

      } catch (e: any) {
        errors.push(e.message)
        console.error('Video analysis error:', e.message)
      }
    }

    if (newAnalyses.length === 0) {
      await supabase.from('style_packs').update({ status: 'failed' }).eq('id', id)
      return NextResponse.json({ error: 'Analysis failed', details: errors }, { status: 500 })
    }

    // Build style data
    const totalVideos = previousCount + newAnalyses.length
    let styleData: any = null

    if (anthropicKey) {
      try {
        const mergeContext = previousStyleData && merge
          ? `\n\nPREVIOUS PROFILE (${previousCount} videos): ${JSON.stringify(previousStyleData)}\n\nMerge with new analyses.`
          : ''
        const synthRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 512,
            messages: [{ role: 'user', content: `Synthesize these TikTok style analyses into one profile. Return ONLY valid JSON:\n${JSON.stringify(newAnalyses)}${mergeContext}\n\n{"cuts_per_30s":0,"urgency_score":0,"authenticity_score":0,"confidence_score":0,"pace":"fast","caption_style":"bold","tags":["tag1","tag2","tag3"],"notes":"summary","total_videos_analyzed":${totalVideos}}` }]
          })
        })
        const sd = await synthRes.json()
        const st = sd.content?.[0]?.text || ''
        const sj = st.match(/\{[\s\S]*\}/)
        if (sj) styleData = JSON.parse(sj[0])
      } catch {}
    }

    if (!styleData) {
      styleData = {
        cuts_per_30s: Math.round(newAnalyses.reduce((s: number, a: any) => s + (a.cuts_per_30s || 8), 0) / newAnalyses.length),
        urgency_score: Math.round(newAnalyses.reduce((s: number, a: any) => s + (a.urgency_score || 65), 0) / newAnalyses.length),
        authenticity_score: Math.round(newAnalyses.reduce((s: number, a: any) => s + (a.authenticity_score || 72), 0) / newAnalyses.length),
        confidence_score: Math.round(newAnalyses.reduce((s: number, a: any) => s + (a.confidence_score || 70), 0) / newAnalyses.length),
        pace: newAnalyses[0]?.pace || 'fast',
        caption_style: newAnalyses[0]?.caption_style || 'bold',
        tags: newAnalyses[0]?.tags || ['Energetic', 'Fast', 'Authentic'],
        notes: newAnalyses[0]?.notes || 'Analyzed from example videos',
        total_videos_analyzed: totalVideos,
      }
    }
    styleData.total_videos_analyzed = totalVideos

    await supabase.from('style_packs').update({
      status: 'analyzed',
      example_count: totalVideos,
      style_data: styleData,
      description: existingPack.description || styleData.notes,
    }).eq('id', id)

    return NextResponse.json({ success: true, styleData, analyzed: newAnalyses.length, total: totalVideos })

  } catch (err: any) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.from('style_packs').update({ status: 'failed' }).eq('id', id)
    } catch {}
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
