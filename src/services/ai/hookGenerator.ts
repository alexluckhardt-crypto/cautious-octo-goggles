// src/services/ai/hookGenerator.ts
// Generates 10 scored hook options using Claude API.
// Falls back to mock data if API key is not configured.

import type { HookOption, HookType, StyleSignature, SalesIntensity } from '@/types'
import { SALES_INTENSITY_LABELS } from '@/types'
import { generateMockHooks } from '@/lib/mockData'

const HOOK_TYPES: HookType[] = [
  'Curiosity', 'Pain Point', 'Bold Claim', 'Demo First', 'Testimonial',
  'Comparison', 'Problem/Solution', 'Warning', 'Fast Benefit', 'Social Proof',
]

interface HookGenerationInput {
  productName: string
  productNotes: string
  styleSignature?: StyleSignature
  salesIntensity: SalesIntensity
  generationId: string
}

export async function generateHooks(input: HookGenerationInput): Promise<HookOption[]> {
  // Use mock data if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return generateMockHooks(input.productName, input.generationId)
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = buildPrompt(input)
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return parseResponse(text, input.generationId)
  } catch (err) {
    return generateMockHooks(input.productName, input.generationId)
  }
}

function buildPrompt(input: HookGenerationInput): string {
  const intensityLabel = SALES_INTENSITY_LABELS[input.salesIntensity]
  const sigSummary = input.styleSignature
    ? `Urgency: ${input.styleSignature.urgencyScore}/100, Authenticity: ${input.styleSignature.authenticityScore}/100, Emotional Intensity: ${input.styleSignature.emotionalIntensityScore}/100`
    : 'No style signature available — use balanced defaults'

  return `You are an expert TikTok Shop video hook writer. Generate exactly 10 hooks for this product.

PRODUCT: ${input.productName}
PRODUCT NOTES: ${input.productNotes || 'None provided'}
SALES INTENSITY: ${intensityLabel}
STYLE PROFILE: ${sigSummary}

Generate one hook for EACH of these types (in this exact order):
${HOOK_TYPES.join(', ')}

Rules:
- Each hook must be punchy, under 15 words
- Match the sales intensity level
- Be specific to this product — no generic hooks
- Score based on TikTok Shop conversion potential (0-100)

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "hookType": "Curiosity",
    "text": "hook text here",
    "score": 85,
    "rationale": "one sentence explaining why this hook works"
  },
  ...
]`
}

function parseResponse(text: string, generationId: string): HookOption[] {
  // Strip any markdown code fences if present
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const parsed = JSON.parse(clean) as Array<{
    hookType: HookType
    text: string
    score: number
    rationale: string
  }>

  return parsed.map((h, i) => ({
    id: `hook_${generationId}_${i}`,
    generationId,
    hookType: h.hookType,
    text: h.text,
    score: h.score,
    rationale: h.rationale,
    isSelected: false,
    createdAt: new Date().toISOString(),
  }))
}
