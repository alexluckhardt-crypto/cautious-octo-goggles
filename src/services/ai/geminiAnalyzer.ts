// src/services/ai/geminiAnalyzer.ts
// Uploads video to Gemini 1.5 Pro, gets back a full scene analysis

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export interface SceneAnalysis {
  transcript: string
  scenes: Scene[]
  bestMoments: BestMoment[]
  productMentions: ProductMention[]
  overallQuality: number // 0-100
  suggestedDuration: number // seconds for final edit
  rawAnalysis: string
}

export interface Scene {
  startSeconds: number
  endSeconds: number
  description: string
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  hasProduct: boolean
  hasSpeech: boolean
  energyLevel: 'high' | 'medium' | 'low'
  keepRating: number // 0-10, how strongly to include this
}

export interface BestMoment {
  startSeconds: number
  endSeconds: number
  reason: string
  type: 'hook' | 'demo' | 'reaction' | 'product_close' | 'cta' | 'testimonial'
}

export interface ProductMention {
  atSeconds: number
  text: string
  visual: boolean // product visible on screen
}

// ── Step 1: Upload video file to Gemini Files API ─────────────────────────────
export async function uploadVideoToGemini(
  videoBuffer: Buffer,
  mimeType: string,
  displayName: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  // Initiate resumable upload
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': videoBuffer.length.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  )

  const uploadUrl = initRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('Failed to get Gemini upload URL')

  // Upload the actual bytes
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
    const err = await uploadRes.text()
    throw new Error(`Gemini upload failed: ${err}`)
  }

  const fileData = await uploadRes.json()
  const fileUri = fileData.file?.uri
  if (!fileUri) throw new Error('No file URI returned from Gemini')

  // Wait for file to be processed (ACTIVE state)
  await waitForGeminiFile(fileUri, apiKey)

  return fileUri
}

async function waitForGeminiFile(fileUri: string, apiKey: string, maxWaitMs = 60000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${fileUri}?key=${apiKey}`)
    const data = await res.json()
    if (data.state === 'ACTIVE') return
    if (data.state === 'FAILED') throw new Error('Gemini file processing failed')
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Gemini file processing timed out')
}

// ── Step 2: Analyze the uploaded video ───────────────────────────────────────
export async function analyzeVideoWithGemini(
  fileUri: string,
  mimeType: string,
  productName: string,
  productNotes: string
): Promise<SceneAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const prompt = `You are an expert TikTok Shop video editor. Analyze this raw footage for a product called "${productName}".

Product details:
${productNotes}

Your job is to analyze every second of this video and return a detailed JSON analysis so an AI editor can make precise cuts.

Return ONLY valid JSON in this exact format:
{
  "transcript": "full spoken transcript with timestamps like [0:03] word word word",
  "scenes": [
    {
      "startSeconds": 0.0,
      "endSeconds": 3.5,
      "description": "creator walking toward camera, good energy",
      "quality": "excellent",
      "hasProduct": false,
      "hasSpeech": true,
      "energyLevel": "high",
      "keepRating": 9
    }
  ],
  "bestMoments": [
    {
      "startSeconds": 2.1,
      "endSeconds": 5.8,
      "reason": "Strong hook moment - creator reacts to product result",
      "type": "hook"
    }
  ],
  "productMentions": [
    {
      "atSeconds": 8.2,
      "text": "this serum literally changed my skin",
      "visual": true
    }
  ],
  "overallQuality": 82,
  "suggestedDuration": 28,
  "rawAnalysis": "2-3 sentence overall summary of the footage"
}

Be precise with timestamps. Rate every scene honestly. Identify the single best hook moment, best product demo moment, best reaction, and best CTA moment.`

  // Try models in order — Gemini deprecates models frequently
  const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash']
  const reqBody = JSON.stringify({
    contents: [{ parts: [{ file_data: { mime_type: mimeType, file_uri: fileUri } }, { text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  })
  let res: Response | null = null
  let lastErr = ''
  for (const model of GEMINI_MODELS) {
    const attempt = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: reqBody })
    if (attempt.ok) { res = attempt; break }
    lastErr = await attempt.text()
    if (attempt.status !== 404) break // only retry on model-not-found
  }
  if (!res) throw new Error(`Gemini analysis failed: ${lastErr}`)

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Parse JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Gemini returned no JSON')

  try {
    return JSON.parse(jsonMatch[0]) as SceneAnalysis
  } catch {
    throw new Error(`Failed to parse Gemini response: ${raw.slice(0, 200)}`)
  }
}

// ── Mock fallback (used when GEMINI_API_KEY not set) ─────────────────────────
export function mockSceneAnalysis(productName: string): SceneAnalysis {
  return {
    transcript: `[0:00] Hey guys so I've been using this ${productName} for three weeks now [0:04] and honestly I was super skeptical at first [0:07] but look at my skin right now [0:09] like zero filter zero editing [0:12] this stuff actually works [0:15] I'm going to show you exactly how I use it [0:18] okay so first you just [0:20] put a small amount right here [0:23] and just like that [0:25] the results speak for themselves [0:28] link is in my bio get it before it sells out`,
    scenes: [
      { startSeconds: 0, endSeconds: 3, description: 'Creator intro, high energy, facing camera', quality: 'excellent', hasProduct: false, hasSpeech: true, energyLevel: 'high', keepRating: 9 },
      { startSeconds: 3, endSeconds: 7, description: 'Skepticism setup, relatable moment', quality: 'good', hasProduct: false, hasSpeech: true, energyLevel: 'medium', keepRating: 7 },
      { startSeconds: 7, endSeconds: 12, description: 'Face reveal close-up, strong visual proof', quality: 'excellent', hasProduct: false, hasSpeech: true, energyLevel: 'high', keepRating: 10 },
      { startSeconds: 12, endSeconds: 18, description: 'Product application demo', quality: 'excellent', hasProduct: true, hasSpeech: true, energyLevel: 'medium', keepRating: 9 },
      { startSeconds: 18, endSeconds: 24, description: 'Application close-up', quality: 'good', hasProduct: true, hasSpeech: true, energyLevel: 'medium', keepRating: 8 },
      { startSeconds: 24, endSeconds: 30, description: 'CTA and result reveal', quality: 'excellent', hasProduct: true, hasSpeech: true, energyLevel: 'high', keepRating: 10 },
    ],
    bestMoments: [
      { startSeconds: 7, endSeconds: 12, reason: 'Face reveal with zero filter claim — strongest credibility moment', type: 'hook' },
      { startSeconds: 12, endSeconds: 20, reason: 'Product demo with application technique', type: 'demo' },
      { startSeconds: 0, endSeconds: 3, reason: 'High energy opener perfect for pattern interrupt', type: 'reaction' },
      { startSeconds: 24, endSeconds: 30, reason: 'CTA with urgency and result proof', type: 'cta' },
    ],
    productMentions: [
      { atSeconds: 1, text: `this ${productName} for three weeks`, visual: false },
      { atSeconds: 9, text: 'zero filter zero editing', visual: false },
      { atSeconds: 15, text: 'this stuff actually works', visual: false },
      { atSeconds: 25, text: 'results speak for themselves', visual: true },
      { atSeconds: 28, text: 'link is in my bio get it before it sells out', visual: true },
    ],
    overallQuality: 87,
    suggestedDuration: 28,
    rawAnalysis: `Strong UGC-style footage with genuine reactions and good product demonstration. Creator has natural charisma and the face-reveal moment at 7s is a standout hook. Footage is well-lit and stable. Recommended to lead with the face reveal, cut skepticism build-up short, and push the demo earlier.`,
  }
}
