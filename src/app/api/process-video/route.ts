import { NextRequest } from 'next/server'
import { uploadVideoToGemini, analyzeVideoWithGemini, mockSceneAnalysis } from '@/services/ai/geminiAnalyzer'
import { generateEditPlans } from '@/services/ai/editPlanGenerator'
import { getPublicVideoUrl, buildCreatomateRender, submitCreatomateRender, pollCreatomateRender } from '@/services/video/creatomate'
import { MOCK_STYLE_PACKS } from '@/lib/mockData'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Disable Next.js body size limit - we handle streaming ourselves
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  function send(step: number, message: string, done = false, payload: any = null) {
    const data = JSON.stringify({ step, message, done, payload }) + '\n'
    writer.write(encoder.encode(data)).catch(() => {})
  }

  ;(async () => {
    try {
      const formData = await req.formData()
      const file = formData.get('video') as File | null
      const productName = formData.get('productName') as string || 'Product'
      const productNotes = formData.get('productNotes') as string || ''
      const stylePackId = formData.get('stylePackId') as string || 'sp_1'
      const salesIntensity = parseInt(formData.get('salesIntensity') as string || '3')
      const variantKey = (formData.get('variantKey') as string || 'A') as 'A' | 'B' | 'C' | 'D'
      let editOptions: Record<string, any> = {}
      try { editOptions = JSON.parse(formData.get('editOptions') as string || '{}') } catch {}

      // Support both direct file upload and pre-uploaded URL (from browser direct upload)
      const videoUrl = formData.get('videoUrl') as string | null
      const videoName = formData.get('videoName') as string || file?.name || 'video.mp4'
      const videoType = formData.get('videoType') as string || file?.type || 'video/mp4'

      if (!file && !videoUrl) { send(-1, 'No video file uploaded', true); await writer.close(); return }

      const stylePack = MOCK_STYLE_PACKS.find(s => s.id === stylePackId) || MOCK_STYLE_PACKS[0]

      // Step 1: Gemini scene analysis
      send(0, '📤 Uploading footage to Gemini...')
      let sceneAnalysis
      if (process.env.GEMINI_API_KEY) {
        try {
          let videoBuffer: Buffer
          if (videoUrl) {
            const fetchRes = await fetch(videoUrl)
            if (!fetchRes.ok) throw new Error(`Failed to fetch video from storage: ${fetchRes.status}`)
            videoBuffer = Buffer.from(await fetchRes.arrayBuffer())
          } else {
            videoBuffer = Buffer.from(await file!.arrayBuffer())
          }
          // Wrap Gemini in a 45s timeout (Vercel hobby = 60s total limit)
          const geminiTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 45000)
          )
          const fileUri = await Promise.race([
            uploadVideoToGemini(videoBuffer, videoType, videoName),
            geminiTimeout,
          ])
          send(1, '🤖 Gemini analyzing scenes...')
          sceneAnalysis = await Promise.race([
            analyzeVideoWithGemini(fileUri, videoType, productName, productNotes),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 45000)),
          ])
        } catch (geminiErr: any) {
          if (geminiErr.message === 'GEMINI_TIMEOUT') {
            send(1, '🤖 Gemini timed out — using smart mock analysis...')
          } else {
            send(1, `🤖 Gemini error (${geminiErr.message.slice(0, 60)}) — using mock analysis...`)
          }
          sceneAnalysis = mockSceneAnalysis(productName)
        }
      } else {
        await new Promise(r => setTimeout(r, 800))
        send(1, '🤖 Using mock scene analysis (no GEMINI_API_KEY)...')
        sceneAnalysis = mockSceneAnalysis(productName)
      }

      // Step 2: Claude edit plans — pass editOptions so Claude respects them
      send(2, '✍️ Claude generating edit variants...')
      const allVariants = await generateEditPlans(sceneAnalysis, stylePack, productName, productNotes, salesIntensity, editOptions)
      const variant = allVariants[variantKey]

      // Step 3: Creatomate render
      let renderResult: { url?: string; error?: string; rendered: boolean } = {
        rendered: false,
        error: 'CREATOMATE_API_KEY not configured — add it to Vercel env vars',
      }

      if (process.env.CREATOMATE_API_KEY) {
        send(3, '☁️ Uploading video for rendering...')
        // Use already-uploaded URL if available, otherwise upload now
        const publicUrl = videoUrl || await getPublicVideoUrl(
          file ? Buffer.from(await file.arrayBuffer()) : Buffer.alloc(0),
          videoName, videoType
        )

        send(3, '🎬 Creatomate rendering your video...')
        const renderPayload = buildCreatomateRender(
          publicUrl, variant.cuts, variant.captions,
          variant.hookText, variant.ctaText, productName, editOptions
        )
        const renderId = await submitCreatomateRender(renderPayload)
        const result = await pollCreatomateRender(renderId)
        renderResult = { rendered: result.status === 'succeeded', url: result.url, error: result.error }
      } else {
        send(3, '⚠️ Skipping render (no CREATOMATE_API_KEY)...')
        await new Promise(r => setTimeout(r, 400))
      }

      send(4, '✅ Done!', true, {
        success: true,
        sceneAnalysis,
        variants: allVariants,
        selectedVariant: { key: variantKey, ...variant },
        render: renderResult,
        editOptions,
      })
    } catch (err: any) {
      send(-1, `Error: ${err.message}`, true)
    } finally {
      await writer.close().catch(() => {})
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
