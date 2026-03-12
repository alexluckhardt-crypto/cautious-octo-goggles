// src/lib/mockData.ts
// Realistic mock data used when Supabase is not yet configured.
// The app checks for NEXT_PUBLIC_SUPABASE_URL — if missing, falls back to this.

import type { StylePack, Project, HookOption, GenerationVariant, HookType, VariantKey } from '@/types'

export const MOCK_USER = {
  id: 'user_demo',
  name: 'Alex Creator',
  email: 'alex@example.com',
  avatarUrl: null,
  plan: 'pro' as const,
  createdAt: '2024-01-01',
}

export const MOCK_STYLE_PACKS: StylePack[] = [
  {
    id: 'sp_1',
    userId: 'user_demo',
    name: 'High Energy Drops',
    description: 'Fast cuts, bold captions, aggressive CTAs',
    status: 'analyzed',
    exampleCount: 4,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    profile: {
      id: 'prof_1',
      stylePackId: 'sp_1',
      pace: 'Very Fast',
      cutFrequency: 'High',
      captionDensity: 'Dense',
      hookAggressiveness: 'Aggressive',
      salesIntensityBaseline: 'Strong Sell',
      ctaFrequency: 'High',
      zoomFrequency: 'High',
      preferredStructure: 'Hook > Problem > Demo > CTA',
      preferredTone: 'Energetic',
      productRevealTiming: 'Early (3s)',
      authenticityVsPolish: 40,
      patternInterruptFrequency: 'High',
      updatedAt: '2024-01-15',
    },
    signature: {
      id: 'sig_1',
      stylePackId: 'sp_1',
      avgClipDuration: 1.8,
      cutsPer30Seconds: 16,
      productRevealSeconds: 3,
      avgCaptionWords: 5,
      captionLinesPerScreen: 1,
      ctaFrequency: 3.2,
      zoomFrequency: 4.1,
      proofFrequency: 1.8,
      urgencyScore: 88,
      emotionalIntensityScore: 82,
      polishScore: 65,
      authenticityScore: 72,
      hookTypeDistribution: {
        'Curiosity': 0.3, 'Pain Point': 0.2, 'Bold Claim': 0.15,
        'Demo First': 0.1, 'Testimonial': 0.05, 'Comparison': 0.05,
        'Problem/Solution': 0.05, 'Warning': 0.03, 'Fast Benefit': 0.05, 'Social Proof': 0.02,
      },
      styleConfidence: 0.94,
      updatedAt: '2024-01-15',
    },
  },
  {
    id: 'sp_2',
    userId: 'user_demo',
    name: 'Authentic Haul',
    description: 'Natural lighting, conversational tone, soft sell',
    status: 'analyzed',
    exampleCount: 3,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
    profile: {
      id: 'prof_2',
      stylePackId: 'sp_2',
      pace: 'Relaxed',
      cutFrequency: 'Low',
      captionDensity: 'Sparse',
      hookAggressiveness: 'Soft',
      salesIntensityBaseline: 'Organic',
      ctaFrequency: 'Low',
      zoomFrequency: 'None',
      preferredStructure: 'Hook > Story > Reveal > Soft CTA',
      preferredTone: 'Conversational',
      productRevealTiming: 'Mid (8s)',
      authenticityVsPolish: 80,
      patternInterruptFrequency: 'Low',
      updatedAt: '2024-02-01',
    },
    signature: {
      id: 'sig_2',
      stylePackId: 'sp_2',
      avgClipDuration: 4.2,
      cutsPer30Seconds: 7,
      productRevealSeconds: 8,
      avgCaptionWords: 8,
      captionLinesPerScreen: 2,
      ctaFrequency: 0.8,
      zoomFrequency: 0.5,
      proofFrequency: 2.1,
      urgencyScore: 45,
      emotionalIntensityScore: 60,
      polishScore: 40,
      authenticityScore: 92,
      hookTypeDistribution: {
        'Curiosity': 0.1, 'Pain Point': 0.25, 'Bold Claim': 0.05,
        'Demo First': 0.15, 'Testimonial': 0.2, 'Comparison': 0.05,
        'Problem/Solution': 0.1, 'Warning': 0.0, 'Fast Benefit': 0.05, 'Social Proof': 0.05,
      },
      styleConfidence: 0.88,
      updatedAt: '2024-02-01',
    },
  },
]

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj_1',
    userId: 'user_demo',
    name: 'Summer Skincare Drop',
    productName: 'Glow Serum Pro',
    productNotes: '• Clinically tested\n• Results visible in 7 days\n• Under $30\n• Cruelty free',
    status: 'generated',
    stylePackId: 'sp_1',
    salesIntensity: 3,
    createdAt: '2024-03-10',
    updatedAt: '2024-03-10',
  },
  {
    id: 'proj_2',
    userId: 'user_demo',
    name: 'Workout Supplement Launch',
    productName: 'MaxPump Pre-Workout',
    productNotes: '• 200mg caffeine\n• Zero sugar\n• 30 servings\n• Tested formula',
    status: 'processing',
    stylePackId: 'sp_1',
    salesIntensity: 4,
    createdAt: '2024-03-12',
    updatedAt: '2024-03-12',
  },
]

const HOOK_TYPES: HookType[] = [
  'Curiosity', 'Pain Point', 'Bold Claim', 'Demo First', 'Testimonial',
  'Comparison', 'Problem/Solution', 'Warning', 'Fast Benefit', 'Social Proof',
]

export function generateMockHooks(productName: string, generationId = 'gen_mock'): HookOption[] {
  const texts: Record<HookType, string> = {
    'Curiosity': `Wait — this ${productName} does WHAT?? 👀`,
    'Pain Point': `If your skin is dry, tired, and just... over it — watch this`,
    'Bold Claim': `I tested 47 products. Only ONE actually worked.`,
    'Demo First': `*immediately shows result* No filter. No edit. No cap.`,
    'Testimonial': `"I've been using it 3 weeks and I cried looking in the mirror"`,
    'Comparison': `Everyone's buying the $200 version. This $40 one does the same thing.`,
    'Problem/Solution': `Problem: dull skin. Solution: took me 10 years to find.`,
    'Warning': `DO NOT buy ${productName} until you watch this`,
    'Fast Benefit': `In 30 seconds your skin routine changes forever`,
    'Social Proof': `500K people already switched. Here's why.`,
  }
  const rationales: Record<HookType, string> = {
    'Curiosity': 'High pattern interrupt, immediate curiosity gap stops scroll',
    'Pain Point': 'Empathy-first hook targets exact ICP pain point',
    'Bold Claim': 'Authority + specificity = credibility spike',
    'Demo First': 'Show don\'t tell — results-first format converts',
    'Testimonial': 'Social proof leveraged before product reveal',
    'Comparison': 'Price anchoring creates perceived value',
    'Problem/Solution': 'Classic PAS framework — proven formula',
    'Warning': 'Warning hooks stop thumbs cold',
    'Fast Benefit': 'Speed + benefit = low-friction engagement',
    'Social Proof': 'Herd behavior triggers FOMO immediately',
  }
  const scores: Record<HookType, number> = {
    'Curiosity': 92, 'Pain Point': 88, 'Bold Claim': 85, 'Demo First': 90,
    'Testimonial': 82, 'Comparison': 86, 'Problem/Solution': 84,
    'Warning': 91, 'Fast Benefit': 87, 'Social Proof': 83,
  }
  return HOOK_TYPES.map((type, i) => ({
    id: `hook_mock_${i}`,
    generationId,
    hookType: type,
    text: texts[type],
    score: scores[type],
    rationale: rationales[type],
    isSelected: false,
    createdAt: new Date().toISOString(),
  }))
}

export function generateMockVariants(
  hooks: HookOption[],
  generationId = 'gen_mock'
): GenerationVariant[] {
  const configs = [
    { key: 'A' as VariantKey, variantName: 'Max Conversion', hookIndex: 0, styleMatchScore: 94, strategySummary: 'Maximum conversion pressure with urgency stacking, price anchoring, and triple CTA reinforcement', durationSecs: 28 },
    { key: 'B' as VariantKey, variantName: 'Authentic UGC', hookIndex: 1, styleMatchScore: 88, strategySummary: 'Native UGC feel with handheld camera simulation, raw pacing, and authentic testimonial arc', durationSecs: 34 },
    { key: 'C' as VariantKey, variantName: 'Fast Cut', hookIndex: 7, styleMatchScore: 91, strategySummary: 'High-retention fast-cut format optimized for watch time with pattern interrupts every 2.3 seconds', durationSecs: 22 },
    { key: 'D' as VariantKey, variantName: 'Trust-Driven', hookIndex: 4, styleMatchScore: 82, strategySummary: 'Trust-building testimonial arc with social proof stacking and soft authority positioning', durationSecs: 38 },
  ]
  return configs.map((c, i) => ({
    id: `var_mock_${i}`,
    generationId,
    variantKey: c.key,
    variantName: c.variantName,
    strategySummary: c.strategySummary,
    styleMatchScore: c.styleMatchScore,
    hookOptionId: hooks[c.hookIndex]?.id,
    mockVideoUrl: undefined,
    durationSecs: c.durationSecs,
    status: 'ready' as const,
    createdAt: new Date().toISOString(),
    editPlan: {
      id: `plan_mock_${i}`,
      variantId: `var_mock_${i}`,
      hookSegment: { durationSeconds: 5, style: hooks[c.hookIndex]?.hookType || 'Curiosity' },
      bodySegments: [
        { label: 'problem', seconds: 8 },
        { label: 'solution_intro', seconds: 6 },
        { label: 'demo', seconds: 12 },
      ],
      productDemoSegments: [
        { label: 'feature_1', seconds: 4 },
        { label: 'feature_2', seconds: 4 },
        { label: 'result', seconds: 5 },
      ],
      socialProofSegment: { durationSeconds: 6, type: 'testimonial_overlay' },
      ctaSegment: { durationSeconds: 4, urgencyLevel: ['extreme', 'low', 'high', 'medium'][i] },
      captionStyle: ['bold_kinetic', 'handwritten', 'minimal_pop', 'clean_serif'][i],
      pacingTarget: [1.8, 4.1, 1.2, 3.5][i],
      transitionInstructions: ['hard_cuts_only', 'smooth_match_cuts', 'smash_cuts', 'crossfade_soft'][i],
      zoomInstructions: ['high', 'low', 'very_high', 'none'][i],
      salesIntensity: ['aggressive', 'organic', 'strong', 'balanced'][i],
      styleMatchConfidence: [0.94, 0.88, 0.91, 0.82][i],
      hookType: (hooks[c.hookIndex]?.hookType || 'Curiosity') as HookType,
      productRevealTargetSeconds: [3, 9, 2, 7][i],
      fullJson: {},
      createdAt: new Date().toISOString(),
    },
  }))
}
