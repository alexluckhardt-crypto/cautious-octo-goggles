// src/services/video/creatomate.ts
const CREATOMATE_API = 'https://api.creatomate.com/v1'

export interface CreatomateRenderResult {
  renderId: string
  status: 'planned' | 'waiting' | 'transcoding' | 'succeeded' | 'failed'
  url?: string
  error?: string
}

export function buildCreatomateRender(
  videoUrl: string,
  cuts: Array<{ startSeconds: number; endSeconds: number; label: string }>,
  captions: Array<{ text: string; startSeconds: number; endSeconds: number; style: string; fontSize: number; color: string; outlineColor: string }>,
  hookText: string,
  ctaText: string,
  productName: string,
  editOptions: Record<string, any> = {}
) {
  // Respect caption settings
  if (editOptions.addCaptions === false) captions = []
  let currentTime = 0
  const videoElements: any[] = []
  const textElements: any[] = []

  cuts.forEach((cut, i) => {
    const duration = Math.max(0.1, cut.endSeconds - cut.startSeconds)
    const isDemo = cut.label.includes('demo')

    videoElements.push({
      id: `clip_${i}`,
      type: 'video',
      track: 1,
      time: `${currentTime}s`,
      duration: `${duration}s`,
      source: videoUrl,
      trim_start: `${cut.startSeconds}s`,
      trim_duration: `${duration}s`,
      animations: [
        ...(i === 0 ? [{ time: 'start', duration: '0.3s', transition: true, easing: 'linear', type: 'fade' }] : []),
        ...(isDemo ? [{ time: 'start', duration: `${duration}s`, easing: 'linear', type: 'scale', x_scale: '100%', y_scale: '100%', fade: false }] : []),
      ],
    })
    currentTime += duration
  })

  captions.forEach((cap, i) => {
    const duration = Math.max(0.5, cap.endSeconds - cap.startSeconds)
    const isCenter = cap.style === 'bold_center' || cap.style === 'kinetic'
    const isTop = cap.style === 'top_bar'
    const yPos = isTop ? '8%' : isCenter ? '50%' : '82%'
    const bgColor = cap.style === 'top_bar' ? '#FFFF00' : 'transparent'
    const textColor = cap.style === 'top_bar' ? '#000000' : (cap.color || '#FFFFFF')

    textElements.push({
      id: `caption_${i}`,
      type: 'text',
      track: 2,
      time: `${cap.startSeconds}s`,
      duration: `${duration}s`,
      text: cap.text,
      font_family: isCenter ? 'Montserrat' : 'Open Sans',
      font_weight: '800',
      font_size: `${Math.min(cap.fontSize * 0.045, 8)}vmin`,
      fill_color: textColor,
      stroke_color: cap.outlineColor || '#000000',
      stroke_width: '2 vmin',
      background_color: bgColor,
      background_x_padding: '3%',
      background_y_padding: '2%',
      background_border_radius: '4px',
      x_alignment: '50%',
      y_alignment: yPos,
      width: '88%',
      animations: [
        { time: 'start', duration: '0.15s', easing: 'back-out', type: 'scale', x_scale: '0%', y_scale: '0%', fade: true },
        { time: 'end', duration: '0.1s', easing: 'linear', type: 'fade', fade: false },
      ],
    })
  })

  return {
    source: {
      output_format: 'mp4',
      frame_rate: editOptions.frameRate || 30,
      width: 1080,
      height: 1920,
      elements: [...videoElements, ...textElements],
    }
  }
}

export async function submitCreatomateRender(renderPayload: object): Promise<string> {
  const apiKey = process.env.CREATOMATE_API_KEY
  if (!apiKey) throw new Error('CREATOMATE_API_KEY not configured')

  const res = await fetch(`${CREATOMATE_API}/renders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(renderPayload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Creatomate render failed: ${err}`)
  }

  const data = await res.json()
  const renderId = Array.isArray(data) ? data[0]?.id : data?.id
  if (!renderId) throw new Error('No render ID returned from Creatomate')
  return renderId
}

export async function pollCreatomateRender(renderId: string, maxWaitMs = 50000): Promise<CreatomateRenderResult> {
  const apiKey = process.env.CREATOMATE_API_KEY
  if (!apiKey) throw new Error('CREATOMATE_API_KEY not configured')

  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${CREATOMATE_API}/renders/${renderId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error(`Creatomate poll failed: ${res.status}`)

    const data = await res.json()
    if (data.status === 'succeeded') return { renderId, status: 'succeeded', url: data.url }
    if (data.status === 'failed') return { renderId, status: 'failed', error: data.error_message || 'Render failed' }

    await new Promise(r => setTimeout(r, 4000))
  }
  return { renderId, status: 'failed', error: `Render still processing. Check Creatomate dashboard for render ID: ${renderId}` }
}

// Upload source video so Creatomate can access it.
// Tries Supabase storage first, then falls back to Creatomate's own asset upload.
export async function getPublicVideoUrl(videoBuffer: Buffer, fileName: string, mimeType = 'video/mp4'): Promise<string> {
  // Option 1: Upload to Supabase Storage (if configured)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://')) {
    try {
      const path = `uploads/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/raw-footage/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(videoBuffer),
      })
      if (uploadRes.ok) {
        return `${supabaseUrl}/storage/v1/object/public/raw-footage/${path}`
      }
    } catch {
      // Fall through to Creatomate upload
    }
  }

  // Option 2: Upload directly to Creatomate as a source asset
  const apiKey = process.env.CREATOMATE_API_KEY
  if (apiKey) {
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(videoBuffer)], { type: mimeType })
    formData.append('file', blob, fileName)

    const res = await fetch(`${CREATOMATE_API}/assets`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      const assetUrl = data.url || data.source_url
      if (assetUrl) return assetUrl
    }
  }

  throw new Error('Could not upload video. Please add NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to Vercel, or ensure CREATOMATE_API_KEY is set.')
}
