'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MOCK_PROJECTS, MOCK_STYLE_PACKS } from '@/lib/mockData'

type Stage = 'upload' | 'analyzing' | 'results'
type VariantKey = 'A' | 'B' | 'C' | 'D'

interface ProjectData {
  id: string
  name: string
  productName: string
  productNotes?: string
  stylePackId: string
  salesIntensity: number
  editOptions?: Record<string, any>
}

interface ProcessingResult {
  sceneAnalysis: any
  variants: Record<VariantKey, any>
  selectedVariant: any
  render: { url?: string; error?: string; rendered: boolean }
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

function GenStep({ label, state }: { label: string; state: 'done' | 'active' | 'pending' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: state === 'done' ? '#22c55e' : state === 'active' ? 'var(--accent)' : 'var(--border)',
        fontSize: 13, fontWeight: 700, color: '#fff',
        boxShadow: state === 'active' ? '0 0 12px rgba(91,140,255,0.6)' : 'none',
        transition: 'all 0.4s',
      }}>
        {state === 'done' ? '✓' : state === 'active' ? '⟳' : '○'}
      </div>
      <span style={{
        fontSize: 14,
        color: state === 'done' ? '#22c55e' : state === 'active' ? 'var(--text)' : 'var(--text3)',
        fontWeight: state === 'active' ? 600 : 400,
        transition: 'color 0.4s',
      }}>{label}</span>
    </div>
  )
}

function CaptionPreview({ captions }: { captions: any[] }) {
  const [time, setTime] = useState(0)
  const active = captions.filter(c => time >= c.startSeconds && time <= c.endSeconds)
  const total = Math.max(...captions.map(c => c.endSeconds), 30)
  return (
    <div>
      <div style={{
        position: 'relative', background: '#111', borderRadius: 12,
        aspectRatio: '9/16', maxHeight: 300, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
      }}>
        <div style={{ color: '#333', fontSize: 12 }}>📹 Caption Preview</div>
        {active.map((cap, i) => {
          const isCenter = cap.style === 'bold_center' || cap.style === 'kinetic'
          const isTop = cap.style === 'top_bar'
          return (
            <div key={i} style={{
              position: 'absolute',
              bottom: isTop || isCenter ? undefined : 40,
              top: isTop ? 20 : isCenter ? '50%' : undefined,
              left: '50%',
              transform: `translateX(-50%)${isCenter ? ' translateY(-50%)' : ''}`,
              color: cap.color, fontSize: Math.round(cap.fontSize * 0.35),
              fontWeight: 900, textAlign: 'center',
              textShadow: `2px 2px 0 ${cap.outlineColor}, -2px -2px 0 ${cap.outlineColor}, 2px -2px 0 ${cap.outlineColor}, -2px 2px 0 ${cap.outlineColor}`,
              whiteSpace: 'pre-wrap', maxWidth: '85%', lineHeight: 1.2,
              fontFamily: 'Impact, Arial Black, sans-serif',
            }}>{cap.text}</div>
          )
        })}
      </div>
      <input type="range" min={0} max={total} step={0.1} value={time}
        onChange={e => setTime(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
        <span>{fmtDuration(time)}</span><span>{fmtDuration(total)}</span>
      </div>
    </div>
  )
}

const GEN_STEPS = [
  '📤 Uploading footage...',
  '🤖 Gemini analyzing scenes...',
  '✍️ Claude generating edit plans...',
  '🎬 Creatomate rendering video...',
  '✅ Finalizing...',
]

export default function ProjectWorkspace() {
  const { id } = useParams()
  const router = useRouter()

  // Load project: first try sessionStorage (from new project wizard), then fall back to mock
  const [project, setProject] = useState<ProjectData>(() => {
    try {
      const stored = sessionStorage.getItem('clipforge_project')
      if (stored) {
        const data = JSON.parse(stored)
        if (data.id === id || id === data.id) return data
      }
    } catch {}
    const mock = MOCK_PROJECTS.find(p => p.id === id as string) || MOCK_PROJECTS[0]
    return {
      id: mock.id,
      name: mock.name,
      productName: mock.productName,
      productNotes: mock.productNotes,
      stylePackId: mock.stylePackId || 'sp_1',
      salesIntensity: mock.salesIntensity,
    }
  })

  const [allStylePacks, setAllStylePacks] = useState<any[]>(MOCK_STYLE_PACKS)
  useEffect(() => {
    fetch('/api/style-packs')
      .then(r => r.json())
      .then(d => {
        const real = d.data || []
        if (real.length > 0) {
          const realIds = new Set(real.map((p: any) => p.id))
          const mocks = MOCK_STYLE_PACKS.filter((m: any) => !realIds.has(m.id))
          setAllStylePacks([...real, ...mocks])
        }
      })
      .catch(() => {})
  }, [])
  const stylePack = allStylePacks.find((s: any) => s.id === project.stylePackId) || allStylePacks[0]

  const [stage, setStage] = useState<Stage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [genStep, setGenStep] = useState(-1)
  const [genMessage, setGenMessage] = useState('')
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [activeVariant, setActiveVariant] = useState<VariantKey>('A')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    const isVideo = f.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(f.name)
    if (!isVideo) { setError('Please upload a video file (MP4, MOV, AVI, etc)'); return }
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFile(f)
    setFileUrl(URL.createObjectURL(f))
    setError(null)
  }, [fileUrl])

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleGenerate(variantKey: VariantKey = 'A') {
    if (!file) return
    setStage('analyzing'); setGenStep(0); setError(null)
    setGenMessage('Starting...')

    try {
      // Step 1: Get a signed upload URL from our API (uses service role key server-side)
      let videoUrl: string | null = null
      setGenStep(0); setGenMessage('📤 Uploading footage...')

      try {
        const urlRes = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileType: file.type || 'video/mp4' }),
        })
        const uploadData = await urlRes.json()
        if (!urlRes.ok || uploadData.error) {
          throw new Error(`Upload setup failed: ${uploadData.error || urlRes.status}`)
        }
        if (!uploadData.signedUrl) {
          throw new Error('No signed upload URL returned — check Supabase bucket policies')
        }
        // PUT directly to Supabase signed URL — bypasses Vercel, no size limit
        const uploadRes = await fetch(uploadData.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'video/mp4' },
          body: file,
        })
        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => uploadRes.status.toString())
          throw new Error(`Supabase upload failed (${uploadRes.status}): ${errText.slice(0, 300)}`)
        }
        videoUrl = uploadData.publicUrl
        setGenMessage('✅ Footage uploaded!')
      } catch (uploadErr: any) {
        // Always throw upload errors so user sees exactly what failed
        throw uploadErr
      }

      // videoUrl must be set by this point — if Supabase upload failed, we already threw above
      if (!videoUrl) throw new Error('Video upload failed: no storage URL. Check Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) in Vercel.')
      const formData = new FormData()
      formData.append('videoUrl', videoUrl)
      formData.append('videoName', file.name)
      formData.append('videoType', file.type || 'video/mp4')
      formData.append('productName', project.productName)
      formData.append('productNotes', project.productNotes || '')
      formData.append('stylePackId', project.stylePackId)
      formData.append('salesIntensity', project.salesIntensity.toString())
      formData.append('variantKey', variantKey)
      formData.append('editOptions', JSON.stringify(project.editOptions || {}))

      const res = await fetch('/api/process-video', { method: 'POST', body: formData })
      if (!res.ok || !res.body) {
        let detail = ''
        try { const t = await res.text(); detail = t.slice(0, 200) } catch {}
        throw new Error(`Server error ${res.status}: ${detail || 'Processing failed'}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            if (msg.step >= 0) { setGenStep(msg.step); setGenMessage(msg.message) }
            if (msg.done && msg.payload) {
              setResult(msg.payload); setActiveVariant(variantKey); setStage('results')
              return
            }
            if (msg.done && msg.step === -1) throw new Error(msg.message.replace('Error: ', ''))
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setStage('upload'); setGenStep(-1)
    }
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={() => router.push('/projects')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', padding: 0 }}>← Projects</button>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{project.name}</h1>
        <span style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--surface2)', padding: '3px 10px', borderRadius: 20 }}>{stylePack.name}</span>
      </div>

      {/* UPLOAD */}
      {stage === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div>
            <label
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                display: 'block',
                border: `2px dashed ${dragging ? 'var(--accent)' : file ? '#22c55e' : 'var(--border)'}`,
                borderRadius: 16, padding: '48px 24px', textAlign: 'center',
                background: dragging ? 'rgba(91,140,255,0.06)' : 'var(--surface)',
                cursor: 'pointer', transition: 'all 0.2s', marginBottom: 16,
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/*,.mov,.mp4,.avi,.mkv,.webm,.m4v,.MOV,.MP4"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.currentTarget.value = '' }}
              />
              <div style={{ fontSize: 48, marginBottom: 12 }}>{file ? '✅' : '🎬'}</div>
              {file ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>{fmtSize(file.size)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>Click to change</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Drop your raw footage here</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>MP4, MOV, AVI · Up to 2GB</div>
                  <div style={{ display: 'inline-block', padding: '9px 22px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>Browse Files</div>
                </>
              )}
            </label>
            {fileUrl && (
              <video src={fileUrl} controls style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', maxHeight: 280, background: '#000' }} />
            )}
            {error && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginTop: 12 }}>
                ⚠️ {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Project Details</div>
              {[['Product', project.productName], ['Style Pack', stylePack.name], ['Sales Level', ['Organic','Light','Balanced','Strong','Aggressive'][project.salesIntensity - 1] || 'Balanced']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text3)' }}>{k}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Pipeline</div>
              {[
                ['🤖', 'Gemini watches footage, identifies every scene'],
                ['✍️', 'Claude writes 4 edit variants with precise cuts'],
                ['🎬', 'Creatomate renders the polished video'],
                ['📥', 'Download your finished TikTok-ready clip'],
              ].map(([icon, text]) => (
                <div key={text as string} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 12, color: 'var(--text2)' }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleGenerate('A')}
              disabled={!file}
              style={{
                padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none',
                background: file ? 'linear-gradient(135deg, var(--accent), var(--purple))' : 'var(--border)',
                color: '#fff', cursor: file ? 'pointer' : 'not-allowed',
                boxShadow: file ? '0 4px 20px rgba(91,140,255,0.4)' : 'none',
              }}
            >
              {file ? '🚀 Generate Edit' : 'Upload a video first'}
            </button>
          </div>
        </div>
      )}

      {/* ANALYZING */}
      {stage === 'analyzing' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 48px', maxWidth: 440, width: '100%' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 20 }}>⚡</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', textAlign: 'center', marginTop: 0, marginBottom: 28 }}>Processing your footage</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {GEN_STEPS.map((label, i) => (
                <div key={i}>
                  <GenStep label={label} state={i < genStep ? 'done' : i === genStep ? 'active' : 'pending'} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, height: 4, background: 'var(--border)', borderRadius: 4 }}>
              <div style={{
                height: 4, background: 'linear-gradient(90deg, var(--accent), var(--purple))',
                borderRadius: 4, width: `${Math.max(5, ((genStep + 1) / GEN_STEPS.length) * 100)}%`,
                transition: 'width 0.8s ease'
              }} />
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
              {genMessage || '30–90 seconds depending on video length'}
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {stage === 'results' && result && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['A','B','C','D'] as VariantKey[]).map(key => {
              const v = result.variants[key]
              return (
                <button key={key} onClick={() => setActiveVariant(key)} style={{
                  padding: '10px 18px', borderRadius: 10,
                  border: `2px solid ${activeVariant === key ? 'var(--accent)' : 'var(--border)'}`,
                  background: activeVariant === key ? 'rgba(91,140,255,0.1)' : 'var(--surface)',
                  color: activeVariant === key ? 'var(--accent)' : 'var(--text2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <span style={{ fontWeight: 800 }}>Variant {key}</span>
                  {v && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text3)' }}>{v.variantName}</span>}
                </button>
              )
            })}
            <button onClick={() => { setStage('upload'); setResult(null) }} style={{
              marginLeft: 'auto', padding: '10px 16px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text3)', fontSize: 13, cursor: 'pointer'
            }}>↩ Upload New</button>
          </div>

          {result.variants[activeVariant] && (() => {
            const v = result.variants[activeVariant]
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Variant header */}
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Variant {activeVariant} — {v.variantName}</div>
                        <div style={{ fontSize: 13, color: 'var(--text3)' }}>{v.strategy}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>{v.styleMatchScore}%</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>style match</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {[['🎣 Hook', v.hookType], ['⏱', `${v.totalDurationSeconds}s`], ['✂️ Cuts', `${v.cuts?.length || 0} segments`], ['💬', `${v.captions?.length || 0} captions`]].map(([icon, val]) => (
                        <div key={icon as string} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--text2)' }}>{icon} {val}</div>
                      ))}
                    </div>
                  </div>

                  {/* Hook + CTA */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>🎣 Opening Hook</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>"{v.hookText}"</div>
                      <div style={{ fontSize: 12, color: 'var(--accent)' }}>{v.hookType}</div>
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>📣 CTA</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>"{v.ctaText}"</div>
                      <div style={{ fontSize: 12, color: '#22c55e' }}>Closing call-to-action</div>
                    </div>
                  </div>

                  {/* Cut timeline */}
                  {v.cuts && v.cuts.length > 0 && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>✂️ Cut Timeline</div>
                      <div style={{ display: 'flex', gap: 3, marginBottom: 12, height: 28, borderRadius: 6, overflow: 'hidden' }}>
                        {v.cuts.map((cut: any, i: number) => {
                          const dur = cut.endSeconds - cut.startSeconds
                          const total = v.cuts.reduce((s: number, c: any) => s + (c.endSeconds - c.startSeconds), 0)
                          const colors = ['var(--accent)', 'var(--purple)', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4']
                          return (
                            <div key={i} title={`${cut.label}: ${cut.startSeconds}s → ${cut.endSeconds}s`} style={{
                              flex: dur / total, background: colors[i % colors.length],
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, color: '#fff', fontWeight: 700, minWidth: 20,
                            }}>{dur.toFixed(0)}s</div>
                          )
                        })}
                      </div>
                      {v.cuts.map((cut: any, i: number) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', fontSize: 12,
                          padding: '6px 0', borderBottom: i < v.cuts.length - 1 ? '1px solid var(--border)' : 'none'
                        }}>
                          <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{i + 1}. {cut.label.replace(/_/g, ' ')}</span>
                          <span style={{ color: 'var(--text3)', fontFamily: 'monospace' }}>
                            {cut.startSeconds.toFixed(1)}s → {cut.endSeconds.toFixed(1)}s
                            <span style={{ marginLeft: 8, color: 'var(--accent)' }}>({(cut.endSeconds - cut.startSeconds).toFixed(1)}s)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Gemini analysis */}
                  {result.sceneAnalysis && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>🤖 Footage Analysis</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>{result.sceneAnalysis.rawAnalysis}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[['Footage Quality', `${result.sceneAnalysis.overallQuality}%`], ['Suggested Length', `${result.sceneAnalysis.suggestedDuration}s`], ['Scenes Found', result.sceneAnalysis.scenes?.length || 0]].map(([k, val]) => (
                          <div key={k as string} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{val}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{k}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {v.captions && v.captions.length > 0 && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>💬 Caption Preview</div>
                      <CaptionPreview captions={v.captions} />
                    </div>
                  )}

                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>📥 Output</div>
                    {result.render.rendered ? (
                      <>
                        <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#22c55e', marginBottom: 12 }}>
                          ✅ Rendered by Creatomate
                        </div>
                        {result.render.url && (
                          <video src={result.render.url} controls playsInline
                            style={{ width: '100%', borderRadius: 10, marginBottom: 10, background: '#000', maxHeight: 280 }} />
                        )}
                        <a href={result.render.url} download={`${project.name}_${activeVariant}.mp4`} target="_blank"
                          style={{
                            display: 'block', width: '100%', padding: '12px', borderRadius: 8, boxSizing: 'border-box',
                            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                            color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                            textAlign: 'center', textDecoration: 'none',
                          }}>
                          ⬇️ Download MP4
                        </a>
                      </>
                    ) : (
                      <>
                        <div style={{ background: 'rgba(250,204,21,0.08)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#facc15', marginBottom: 10, lineHeight: 1.5 }}>
                          ⚠️ {result.render.error}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                          Add <code style={{ background: 'var(--surface2)', padding: '1px 4px', borderRadius: 3 }}>CREATOMATE_API_KEY</code> to Vercel env vars to enable rendering.
                        </div>
                      </>
                    )}
                  </div>

                  <button onClick={() => handleGenerate(activeVariant)} style={{
                    padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}>🔄 Regenerate {activeVariant}</button>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
