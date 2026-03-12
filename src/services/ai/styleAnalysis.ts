// src/services/ai/styleAnalysis.ts
// Analyzes uploaded example videos to extract a style profile + signature.
// STUB: Real implementation needs FFmpeg scene detection + Claude Vision.

import type { StyleProfile, StyleSignature, StyleExample, Transcript } from '@/types'

interface AnalysisInput {
  stylePackId: string
  examples: StyleExample[]
  transcripts: Transcript[]
}

interface AnalysisResult {
  profile: Omit<StyleProfile, 'id' | 'stylePackId' | 'updatedAt'>
  signature: Omit<StyleSignature, 'id' | 'stylePackId' | 'updatedAt'>
}

export async function analyzeStyleExamples(input: AnalysisInput): Promise<AnalysisResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildStubAnalysis(input)
  }

  /**
   * REAL IMPLEMENTATION ROADMAP:
   *
   * 1. For each example video:
   *    a. Run FFmpeg scene detection to find cut points:
   *       ffmpeg -i input.mp4 -filter:v "select=gt(scene\,0.3),showinfo" -f null -
   *    b. Extract frames at each cut point for visual analysis
   *    c. Extract audio and run Whisper transcription
   *    d. Send frame samples to Claude Vision with analysis prompt
   *
   * 2. Aggregate results across all examples
   *
   * 3. Call Claude to synthesize into profile + signature
   */

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const transcriptSummary = input.transcripts
      .map(t => t.content)
      .filter(Boolean)
      .join('\n\n---\n\n')
      .slice(0, 3000) // token limit

    const prompt = `Analyze these TikTok Shop video transcripts and metadata to extract an editing style profile.

TRANSCRIPTS:
${transcriptSummary || 'No transcripts available'}

VIDEO COUNT: ${input.examples.length}
DURATIONS: ${input.examples.map(e => `${e.durationSecs || '?'}s`).join(', ')}

Based on the content and style signals in these transcripts, extract:
1. Editing style profile (qualitative)
2. Style signature (quantitative estimates)

Return ONLY valid JSON:
{
  "profile": {
    "pace": "Fast",
    "cutFrequency": "High",
    "captionDensity": "Dense",
    "hookAggressiveness": "Aggressive",
    "salesIntensityBaseline": "Strong Sell",
    "ctaFrequency": "High",
    "zoomFrequency": "Medium",
    "preferredStructure": "Hook > Problem > Demo > CTA",
    "preferredTone": "Energetic",
    "productRevealTiming": "Early (3-5s)",
    "authenticityVsPolish": 55,
    "patternInterruptFrequency": "High",
    "notes": "Style summary here"
  },
  "signature": {
    "avgClipDuration": 2.1,
    "cutsPer30Seconds": 14,
    "productRevealSeconds": 4,
    "avgCaptionWords": 6,
    "captionLinesPerScreen": 1,
    "ctaFrequency": 2.5,
    "zoomFrequency": 3,
    "proofFrequency": 1.5,
    "urgencyScore": 80,
    "emotionalIntensityScore": 75,
    "polishScore": 65,
    "authenticityScore": 70,
    "hookTypeDistribution": { "Curiosity": 0.3, "Pain Point": 0.2, "Bold Claim": 0.15, "Demo First": 0.1, "Testimonial": 0.05, "Comparison": 0.05, "Problem/Solution": 0.05, "Warning": 0.03, "Fast Benefit": 0.05, "Social Proof": 0.02 },
    "styleConfidence": 0.82
  }
}`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    return buildStubAnalysis(input)
  }
}

function buildStubAnalysis(input: AnalysisInput): AnalysisResult {
  // Generate plausible numbers based on example count
  const confidence = Math.min(0.95, 0.6 + input.examples.length * 0.07)

  return {
    profile: {
      pace: 'Fast',
      cutFrequency: 'High',
      captionDensity: 'Moderate',
      hookAggressiveness: 'Assertive',
      salesIntensityBaseline: 'Balanced',
      ctaFrequency: 'Medium',
      zoomFrequency: 'Moderate',
      preferredStructure: 'Hook > Problem > Demo > CTA',
      preferredTone: 'Energetic',
      productRevealTiming: 'Early (4-6s)',
      authenticityVsPolish: 60,
      patternInterruptFrequency: 'Medium',
      notes: `Style extracted from ${input.examples.length} example videos. Stub analysis — add Anthropic API key for real extraction.`,
    },
    signature: {
      avgClipDuration: 2.3,
      cutsPer30Seconds: 13,
      productRevealSeconds: 4.5,
      avgCaptionWords: 6,
      captionLinesPerScreen: 1.5,
      ctaFrequency: 2.1,
      zoomFrequency: 3.0,
      proofFrequency: 1.5,
      urgencyScore: 78,
      emotionalIntensityScore: 74,
      polishScore: 65,
      authenticityScore: 72,
      hookTypeDistribution: {
        'Curiosity': 0.3, 'Pain Point': 0.2, 'Bold Claim': 0.15, 'Demo First': 0.1,
        'Testimonial': 0.05, 'Comparison': 0.05, 'Problem/Solution': 0.05,
        'Warning': 0.03, 'Fast Benefit': 0.05, 'Social Proof': 0.02,
      },
      styleConfidence: confidence,
    },
  }
}
