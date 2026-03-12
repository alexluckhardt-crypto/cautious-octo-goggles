// src/services/ai/editPlanGenerator.ts
// Takes Gemini's scene analysis + style pack → produces precise FFmpeg cut instructions

import Anthropic from '@anthropic-ai/sdk'
import type { SceneAnalysis } from './geminiAnalyzer'
import type { StylePack } from '@/types'

export interface FFmpegCut {
  startSeconds: number
  endSeconds: number
  label: string // e.g. "hook", "demo_1", "cta"
}

export interface Caption {
  text: string
  startSeconds: number
  endSeconds: number
  style: 'bold_center' | 'bottom_third' | 'top_bar' | 'kinetic'
  fontSize: number
  color: string
  outlineColor: string
}

export interface EditPlanResult {
  cuts: FFmpegCut[]
  captions: Caption[]
  totalDurationSeconds: number
  hookText: string
  hookType: string
  ctaText: string
  strategy: string
  styleMatchScore: number
  variantName: string
}

export interface AllVariants {
  A: EditPlanResult
  B: EditPlanResult
  C: EditPlanResult
  D: EditPlanResult
}

// ── Main function ─────────────────────────────────────────────────────────────
export async function generateEditPlans(
  sceneAnalysis: SceneAnalysis,
  stylePack: StylePack,
  productName: string,
  productNotes: string,
  salesIntensity: number,
  editOptions: Record<string, any> = {}
): Promise<AllVariants> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return generateMockEditPlans(sceneAnalysis, productName)

  const client = new Anthropic({ apiKey })

  const styleInfo = stylePack.profile ? `
Style Pack: ${stylePack.name}
- Pace: ${stylePack.profile.pace}
- Cut Frequency: ${stylePack.profile.cutFrequency}
- Hook Style: ${stylePack.profile.hookAggressiveness}
- Structure: ${stylePack.profile.preferredStructure}
- Tone: ${stylePack.profile.preferredTone}
- Product Reveal: ${stylePack.profile.productRevealTiming}
- Sales Baseline: ${stylePack.profile.salesIntensityBaseline}
` : `Style Pack: ${stylePack.name}`

  // Build edit options instructions for Claude
  const optionsInstructions = [
    editOptions.addCaptions === false ? '- DO NOT include any captions in the output — set captions to empty array []' :
      editOptions.captionStyle === 'minimal' ? '- Use minimal clean captions: lower thirds only, small font, white text' :
      '- Use bold TikTok-style captions: CAPS, large font, kinetic/bold_center style',
    editOptions.tightCuts ? `- Use ULTRA TIGHT jump cuts between every spoken word. Maximum gap between any two cuts is ${editOptions.interWordGapMs || 50}ms. Cut right on the last syllable of each word — no breathing room, no natural pauses. This is the TikTok Shop style where every frame counts.` : '',
    editOptions.removeSilence ? `- Explicitly avoid including any silent gaps or pauses longer than ${editOptions.silenceThresholdMs || 500}ms in the cuts` : '',
    editOptions.removeRepeatedLines ? '- If the transcript shows the creator repeated themselves, only include the BEST take of that line, not the repeated version' : '',
    editOptions.removeFillerWords ? '- Avoid timestamps where the creator says "um", "uh", "like", or "you know" as filler' : '',
    editOptions.trimEndPause ? '- End the last cut at the last spoken word — do not include trailing silence' : '',
    editOptions.frameRate === 15 ? '- This will be rendered at 15fps for maximum punch — select cuts that work well with this fast staccato feel' : '',
  ].filter(Boolean).join('\n')

  const prompt = `You are an expert TikTok Shop video editor. You have analyzed raw footage and now need to create 4 precise edit variants.

FOOTAGE ANALYSIS:
${JSON.stringify(sceneAnalysis, null, 2)}

PRODUCT: ${productName}
PRODUCT NOTES: ${productNotes}
SALES INTENSITY: ${salesIntensity}/5

${styleInfo}

Create 4 distinct edit variants (A, B, C, D) using ONLY the timestamps available in the footage analysis above.

Each variant must have:
- Different hook strategy
- Different pacing/cut selection
- Different caption style and text
- Different structural approach

Return ONLY valid JSON:
{
  "A": {
    "variantName": "Max Conversion",
    "strategy": "2-3 sentence strategy description",
    "styleMatchScore": 94,
    "hookText": "exact hook caption text",
    "hookType": "Bold Claim",
    "ctaText": "exact CTA text",
    "totalDurationSeconds": 28,
    "cuts": [
      { "startSeconds": 7.0, "endSeconds": 10.5, "label": "hook" },
      { "startSeconds": 0.0, "endSeconds": 2.8, "label": "energy_intro" },
      { "startSeconds": 12.0, "endSeconds": 19.5, "label": "demo" },
      { "startSeconds": 24.0, "endSeconds": 30.0, "label": "cta" }
    ],
    "captions": [
      {
        "text": "NO FILTER. NO EDIT.",
        "startSeconds": 0.0,
        "endSeconds": 2.5,
        "style": "bold_center",
        "fontSize": 64,
        "color": "#FFFFFF",
        "outlineColor": "#000000"
      },
      {
        "text": "3 weeks of ${productName}",
        "startSeconds": 2.5,
        "endSeconds": 5.0,
        "style": "bottom_third",
        "fontSize": 48,
        "color": "#FFFF00",
        "outlineColor": "#000000"
      }
    ]
  },
  "B": { ... },
  "C": { ... },
  "D": { ... }
}

EDIT OPTIONS TO FOLLOW STRICTLY:
${optionsInstructions}

Rules:
- All timestamps must exist within the footage analysis scenes
- Cuts array defines the ORDER and exact trim points for FFmpeg
- Captions timestamps are relative to the OUTPUT video (after cuts are assembled)
- Make captions punchy, TikTok-native, CAPS for emphasis words
- Variant A: Max conversion, aggressive, fast cuts
- Variant B: Authentic UGC feel, slower, more story
- Variant C: Fast cut hook-first, pattern interrupt
- Variant D: Trust-building, testimonial arc`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in Claude response')

    return JSON.parse(jsonMatch[0]) as AllVariants
  } catch (err) {
    console.error('Claude edit plan error, using mock:', err)
    return generateMockEditPlans(sceneAnalysis, productName, editOptions)
  }
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
function generateMockEditPlans(analysis: SceneAnalysis, productName: string, editOptions: Record<string, any> = {}): AllVariants {
  const hook = analysis.bestMoments.find(m => m.type === 'hook') || analysis.bestMoments[0]
  const demo = analysis.bestMoments.find(m => m.type === 'demo') || analysis.bestMoments[1]
  const cta = analysis.bestMoments.find(m => m.type === 'cta') || analysis.bestMoments[analysis.bestMoments.length - 1]

  const noCaptions = editOptions.addCaptions === false
  const minimalCaps = editOptions.captionStyle === 'minimal'

  function makeCaptions(caps: any[]) {
    if (noCaptions) return []
    if (minimalCaps) return caps.map(c => ({ ...c, style: 'bottom_third', fontSize: 38 }))
    return caps
  }

  return {
    A: {
      variantName: 'Max Conversion',
      strategy: 'Lead with strongest visual proof, compress setup, push product demo early, triple CTA reinforcement. Maximum urgency stacking.',
      styleMatchScore: 94,
      hookText: 'NO FILTER. NO EDIT.',
      hookType: 'Bold Claim',
      ctaText: 'Link in bio ⬆️ before it sells out',
      totalDurationSeconds: 27,
      cuts: [
        { startSeconds: hook.startSeconds, endSeconds: hook.endSeconds, label: 'hook' },
        { startSeconds: 0, endSeconds: 2.5, label: 'energy_intro' },
        { startSeconds: demo.startSeconds, endSeconds: demo.endSeconds, label: 'demo' },
        { startSeconds: cta.startSeconds, endSeconds: cta.endSeconds, label: 'cta' },
      ],
      captions: makeCaptions([
        { text: 'NO FILTER. NO EDIT.', startSeconds: 0, endSeconds: 2.5, style: 'bold_center', fontSize: 68, color: '#FFFFFF', outlineColor: '#000000' },
        { text: `3 weeks of ${productName} 👇`, startSeconds: 2.5, endSeconds: 5.5, style: 'bottom_third', fontSize: 48, color: '#FFFF00', outlineColor: '#000000' },
        { text: 'RESULTS SPEAK FOR THEMSELVES', startSeconds: 5.5, endSeconds: 9, style: 'bold_center', fontSize: 52, color: '#FFFFFF', outlineColor: '#FF0000' },
        { text: 'Link in bio ⬆️ selling out FAST', startSeconds: 22, endSeconds: 27, style: 'bottom_third', fontSize: 48, color: '#FFFFFF', outlineColor: '#000000' },
      ]),
    },
    B: {
      variantName: 'Authentic UGC',
      strategy: 'Lead with relatable skepticism, build trust slowly, let the product demo breathe. Feels native and unsponsored.',
      styleMatchScore: 88,
      hookText: 'I was SO skeptical about this...',
      hookType: 'Pain Point',
      ctaText: 'You have to try this yourself',
      totalDurationSeconds: 34,
      cuts: [
        { startSeconds: 0, endSeconds: 7, label: 'skeptic_intro' },
        { startSeconds: demo.startSeconds, endSeconds: demo.endSeconds + 2, label: 'full_demo' },
        { startSeconds: hook.startSeconds, endSeconds: hook.endSeconds, label: 'reveal' },
        { startSeconds: cta.startSeconds, endSeconds: cta.endSeconds, label: 'soft_cta' },
      ],
      captions: makeCaptions([
        { text: 'I was SO skeptical about this...', startSeconds: 0, endSeconds: 3, style: 'bottom_third', fontSize: 44, color: '#FFFFFF', outlineColor: '#000000' },
        { text: `${productName} - 3 week results`, startSeconds: 8, endSeconds: 12, style: 'bottom_third', fontSize: 40, color: '#FFFFFF', outlineColor: '#000000' },
        { text: 'genuinely shocked 😭', startSeconds: 20, endSeconds: 24, style: 'bottom_third', fontSize: 48, color: '#FFFFFF', outlineColor: '#000000' },
        { text: 'link in bio if you want to try', startSeconds: 29, endSeconds: 34, style: 'bottom_third', fontSize: 40, color: '#FFFFFF', outlineColor: '#000000' },
      ]),
    },
    C: {
      variantName: 'Fast Cut Hook',
      strategy: 'Rapid-fire pattern interrupt opening, 1.5s cuts, maximum retention. Every 2 seconds is a new visual stimulus.',
      styleMatchScore: 91,
      hookText: 'Wait — it does WHAT??',
      hookType: 'Curiosity',
      ctaText: '⚡ Link in bio NOW',
      totalDurationSeconds: 22,
      cuts: [
        { startSeconds: hook.startSeconds, endSeconds: hook.startSeconds + 1.5, label: 'flash_hook' },
        { startSeconds: 0, endSeconds: 1.5, label: 'flash_intro' },
        { startSeconds: demo.startSeconds, endSeconds: demo.startSeconds + 3, label: 'flash_demo_1' },
        { startSeconds: demo.startSeconds + 3, endSeconds: demo.endSeconds, label: 'flash_demo_2' },
        { startSeconds: hook.startSeconds, endSeconds: hook.endSeconds, label: 'result_reveal' },
        { startSeconds: cta.startSeconds, endSeconds: Math.min(cta.endSeconds, cta.startSeconds + 4), label: 'fast_cta' },
      ],
      captions: makeCaptions([
        { text: 'Wait — it does WHAT?? 👀', startSeconds: 0, endSeconds: 1.5, style: 'bold_center', fontSize: 60, color: '#FFFFFF', outlineColor: '#000000' },
        { text: `${productName.toUpperCase()}`, startSeconds: 3, endSeconds: 5, style: 'top_bar', fontSize: 44, color: '#000000', outlineColor: '#FFFF00' },
        { text: '🔥 BEFORE & AFTER 🔥', startSeconds: 9, endSeconds: 12, style: 'bold_center', fontSize: 56, color: '#FF4444', outlineColor: '#000000' },
        { text: '⚡ LINK IN BIO NOW ⚡', startSeconds: 18, endSeconds: 22, style: 'bold_center', fontSize: 60, color: '#FFFF00', outlineColor: '#000000' },
      ]),
    },
    D: {
      variantName: 'Trust Builder',
      strategy: 'Lead with social proof framing, let the creator tell the full story, earn the CTA organically.',
      styleMatchScore: 82,
      hookText: 'Honest review after 3 weeks...',
      hookType: 'Testimonial',
      ctaText: 'Find it in my bio — worth every penny',
      totalDurationSeconds: 38,
      cuts: [
        { startSeconds: 0, endSeconds: 12, label: 'full_story_setup' },
        { startSeconds: demo.startSeconds, endSeconds: demo.endSeconds, label: 'demo' },
        { startSeconds: hook.startSeconds, endSeconds: hook.endSeconds, label: 'proof' },
        { startSeconds: cta.startSeconds, endSeconds: cta.endSeconds, label: 'trust_cta' },
      ],
      captions: makeCaptions([
        { text: 'Honest review after 3 weeks', startSeconds: 0, endSeconds: 3.5, style: 'bottom_third', fontSize: 42, color: '#FFFFFF', outlineColor: '#000000' },
        { text: `${productName}`, startSeconds: 3.5, endSeconds: 6, style: 'bottom_third', fontSize: 52, color: '#AADDFF', outlineColor: '#000000' },
        { text: 'zero filter, zero edits', startSeconds: 22, endSeconds: 26, style: 'bottom_third', fontSize: 44, color: '#FFFFFF', outlineColor: '#000000' },
        { text: 'link in bio — worth every penny 💙', startSeconds: 33, endSeconds: 38, style: 'bottom_third', fontSize: 42, color: '#FFFFFF', outlineColor: '#000000' },
      ]),
    },
  }
}
