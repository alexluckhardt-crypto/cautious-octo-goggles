// src/types/index.ts
// Central type definitions — used across the entire app

export type SalesIntensity = 0 | 1 | 2 | 3 | 4
export const SALES_INTENSITY_LABELS = [
  'Organic',
  'Light Sell',
  'Balanced',
  'Strong Sell',
  'Aggressive Close',
] as const

export type VariantKey = 'A' | 'B' | 'C' | 'D'
export type HookType =
  | 'Curiosity'
  | 'Pain Point'
  | 'Bold Claim'
  | 'Demo First'
  | 'Testimonial'
  | 'Comparison'
  | 'Problem/Solution'
  | 'Warning'
  | 'Fast Benefit'
  | 'Social Proof'

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed'
export type JobType =
  | 'analyze_style_pack'
  | 'transcribe_assets'
  | 'generate_hooks'
  | 'generate_edit_plan'
  | 'render_variant'
  | 'export_video'

// ─── Users ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  plan: 'free' | 'pro' | 'team'
  createdAt: string
}

// ─── Style Packs ──────────────────────────────────────────────────────────────
export interface StylePack {
  id: string
  userId: string
  name: string
  description: string
  status: 'draft' | 'analyzing' | 'analyzed' | 'failed'
  exampleCount: number
  profile?: StyleProfile
  signature?: StyleSignature
  createdAt: string
  updatedAt: string
}

export interface StyleExample {
  id: string
  stylePackId: string
  fileName: string
  fileUrl: string
  thumbnailUrl?: string
  durationSecs?: number
  fileSizeBytes?: number
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  createdAt: string
}

export interface StyleProfile {
  id: string
  stylePackId: string
  pace: string
  cutFrequency: string
  captionDensity: string
  hookAggressiveness: string
  salesIntensityBaseline: string
  ctaFrequency: string
  zoomFrequency: string
  preferredStructure: string
  preferredTone: string
  productRevealTiming: string
  authenticityVsPolish: number // 0-100
  patternInterruptFrequency: string
  notes?: string
  updatedAt: string
}

export interface StyleSignature {
  id: string
  stylePackId: string
  avgClipDuration: number
  cutsPer30Seconds: number
  productRevealSeconds: number
  avgCaptionWords: number
  captionLinesPerScreen: number
  ctaFrequency: number
  zoomFrequency: number
  proofFrequency: number
  urgencyScore: number            // 0-100
  emotionalIntensityScore: number // 0-100
  polishScore: number             // 0-100
  authenticityScore: number       // 0-100
  hookTypeDistribution: Record<HookType, number>
  styleConfidence: number         // 0.0-1.0
  updatedAt: string
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export interface Project {
  id: string
  userId: string
  name: string
  productName: string
  productNotes?: string
  status: 'draft' | 'uploading' | 'processing' | 'generated' | 'failed'
  stylePackId?: string
  matchExampleId?: string
  salesIntensity: SalesIntensity
  assets?: ProjectAsset[]
  createdAt: string
  updatedAt: string
}

export interface ProjectAsset {
  id: string
  projectId: string
  assetType: 'raw_footage' | 'voiceover' | 'image' | 'broll'
  fileName: string
  fileUrl: string
  thumbnailUrl?: string
  durationSecs?: number
  fileSizeBytes?: number
  width?: number
  height?: number
  fps?: number
  status: string
  createdAt: string
}

// ─── Generations ──────────────────────────────────────────────────────────────
export interface Generation {
  id: string
  projectId: string
  status: ProcessingStatus
  stylePackId?: string
  salesIntensity?: number
  matchExampleId?: string
  variants?: GenerationVariant[]
  hookOptions?: HookOption[]
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

export interface GenerationVariant {
  id: string
  generationId: string
  variantKey: VariantKey
  variantName: string
  strategySummary: string
  styleMatchScore: number
  hookOptionId?: string
  mockVideoUrl?: string
  durationSecs?: number
  status: ProcessingStatus | 'ready'
  editPlan?: EditPlan
  createdAt: string
}

export interface HookOption {
  id: string
  generationId: string
  hookType: HookType
  text: string
  score: number
  rationale: string
  isSelected: boolean
  createdAt: string
}

export interface EditPlan {
  id: string
  variantId: string
  hookSegment: { durationSeconds: number; style: string }
  bodySegments: Array<{ label: string; seconds: number }>
  productDemoSegments: Array<{ label: string; seconds: number }>
  socialProofSegment: { durationSeconds: number; type: string }
  ctaSegment: { durationSeconds: number; urgencyLevel: string }
  captionStyle: string
  pacingTarget: number
  transitionInstructions: string
  zoomInstructions: string
  salesIntensity: string
  styleMatchConfidence: number
  hookType: HookType
  productRevealTargetSeconds: number
  fullJson: Record<string, unknown>
  createdAt: string
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export interface Export {
  id: string
  userId: string
  variantId?: string
  projectId?: string
  fileUrl?: string
  fileName?: string
  fileSizeBytes?: number
  format: 'mp4' | 'mov'
  resolution: string
  status: 'queued' | 'rendering' | 'complete' | 'failed'
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export interface ProcessingJob {
  id: string
  type: JobType
  referenceId: string
  referenceType: string
  status: 'queued' | 'running' | ProcessingStatus
  progress: number
  result?: unknown
  errorMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// ─── Transcripts ──────────────────────────────────────────────────────────────
export interface Transcript {
  id: string
  assetId?: string
  exampleId?: string
  content: string
  segments: Array<{ start: number; end: number; text: string; speaker?: string }>
  language: string
  service: string
  createdAt: string
}

// ─── Media ────────────────────────────────────────────────────────────────────
export interface MediaMetadata {
  duration: number
  width?: number
  height?: number
  fps?: number
  size: number
  codec?: string
}

// ─── API helpers ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T
  error?: string
  meta?: { total?: number; page?: number; pageSize?: number }
}

export interface GenerateRequest {
  projectId: string
  stylePackId: string
  salesIntensity: SalesIntensity
  matchExampleId?: string
}

export interface UploadResponse {
  fileUrl: string
  filePath: string
  fileName: string
}
