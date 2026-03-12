// src/services/ai/editPlanner.ts
// Generates structured edit plan JSON for a given variant using Claude.
// Falls back to mock plan if API key not configured.

import type { EditPlan, HookOption, StyleSignature, SalesIntensity, VariantKey, HookType } from '@/types'
import { SALES_INTENSITY_LABELS } from '@/types'

interface EditPlanInput {
  variantId: string
  variantKey: VariantKey
  variantName: string
  productName: string
  productNotes: string
  hook: HookOption
  styleSignature?: StyleSignature
  salesIntensity: SalesIntensity
}

export async function generateEditPlan(input: EditPlanInput): Promise<EditPlan> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildMockPlan(input)
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = buildPrompt(input)
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      id: `plan_${input.variantId}`,
      variantId: input.variantId,
      ...parsed,
      hookType: input.hook.hookType,
      fullJson: parsed,
      createdAt: new Date().toISOString(),
    }
  } catch (err) {
    return buildMockPlan(input)
  }
}

function buildPrompt(input: EditPlanInput): string {
  return `You are a TikTok Shop video editor. Generate a structured edit plan JSON for this variant.

PRODUCT: ${input.productName}
VARIANT: ${input.variantKey} — ${input.variantName}
HOOK: "${input.hook.text}" (type: ${input.hook.hookType})
SALES INTENSITY: ${SALES_INTENSITY_LABELS[input.salesIntensity]}
${input.styleSignature ? `AVG CLIP: ${input.styleSignature.avgClipDuration}s, CUTS/30s: ${input.styleSignature.cutsPer30Seconds}` : ''}

Generate a complete edit plan. Total video: 25-45 seconds. Return ONLY valid JSON:
{
  "hook_segment": { "duration_seconds": 5, "style": "hook type description" },
  "body_segments": [{ "label": "problem", "seconds": 8 }, { "label": "solution", "seconds": 6 }, { "label": "demo", "seconds": 10 }],
  "product_demo_segments": [{ "label": "feature_1", "seconds": 4 }, { "label": "result", "seconds": 5 }],
  "social_proof_segment": { "duration_seconds": 5, "type": "testimonial_overlay" },
  "cta_segment": { "duration_seconds": 4, "urgency_level": "high" },
  "caption_style": "bold_kinetic",
  "pacing_target": 2.1,
  "transition_instructions": "hard_cuts_only",
  "zoom_instructions": "zoom_in_on_product_reveal",
  "sales_intensity": "${SALES_INTENSITY_LABELS[input.salesIntensity].toLowerCase().replace(' ', '_')}",
  "style_match_confidence": 0.88,
  "product_reveal_target_seconds": 4
}`
}

function buildMockPlan(input: EditPlanInput): EditPlan {
  const pacingByVariant: Record<VariantKey, number> = { A: 1.8, B: 4.1, C: 1.2, D: 3.5 }
  const captionByVariant: Record<VariantKey, string> = { A: 'bold_kinetic', B: 'handwritten', C: 'minimal_pop', D: 'clean_serif' }
  const transitionByVariant: Record<VariantKey, string> = { A: 'hard_cuts_only', B: 'smooth_match_cuts', C: 'smash_cuts', D: 'crossfade_soft' }
  const revealByVariant: Record<VariantKey, number> = { A: 3, B: 9, C: 2, D: 7 }
  const confidenceByVariant: Record<VariantKey, number> = { A: 0.94, B: 0.88, C: 0.91, D: 0.82 }

  const fullJson = {
    hook_segment: { duration_seconds: 5, style: input.hook.hookType },
    body_segments: [{ label: 'problem', seconds: 8 }, { label: 'solution_intro', seconds: 6 }, { label: 'demo', seconds: 12 }],
    product_demo_segments: [{ label: 'feature_1', seconds: 4 }, { label: 'feature_2', seconds: 4 }, { label: 'result', seconds: 5 }],
    social_proof_segment: { duration_seconds: 6, type: 'testimonial_overlay' },
    cta_segment: { duration_seconds: 4, urgency_level: input.variantKey === 'A' ? 'extreme' : input.variantKey === 'C' ? 'high' : 'medium' },
    caption_style: captionByVariant[input.variantKey],
    pacing_target: pacingByVariant[input.variantKey],
    transition_instructions: transitionByVariant[input.variantKey],
    zoom_instructions: input.variantKey === 'C' ? 'very_high' : input.variantKey === 'A' ? 'high' : 'none',
    sales_intensity: SALES_INTENSITY_LABELS[input.salesIntensity].toLowerCase(),
    style_match_confidence: confidenceByVariant[input.variantKey],
    product_reveal_target_seconds: revealByVariant[input.variantKey],
  }

  return {
    id: `plan_${input.variantId}`,
    variantId: input.variantId,
    hookSegment: { durationSeconds: 5, style: input.hook.hookType },
    bodySegments: fullJson.body_segments,
    productDemoSegments: fullJson.product_demo_segments,
    socialProofSegment: { durationSeconds: 6, type: 'testimonial_overlay' },
    ctaSegment: { durationSeconds: 4, urgencyLevel: fullJson.cta_segment.urgency_level },
    captionStyle: captionByVariant[input.variantKey],
    pacingTarget: pacingByVariant[input.variantKey],
    transitionInstructions: transitionByVariant[input.variantKey],
    zoomInstructions: fullJson.zoom_instructions,
    salesIntensity: SALES_INTENSITY_LABELS[input.salesIntensity],
    styleMatchConfidence: confidenceByVariant[input.variantKey],
    hookType: input.hook.hookType as HookType,
    productRevealTargetSeconds: revealByVariant[input.variantKey],
    fullJson,
    createdAt: new Date().toISOString(),
  }
}
