'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_STYLE_PACKS } from '@/lib/mockData'

interface EditOptions {
  addCaptions: boolean
  captionStyle: 'tiktok' | 'minimal' | 'none'
  removeSilence: boolean
  silenceThresholdMs: number
  tightCuts: boolean
  interWordGapMs: number
  frameRate: 15 | 24 | 30
  removeRepeatedLines: boolean
  removeFillerWords: boolean
  trimEndPause: boolean
}

interface StylePack {
  id: string
  name: string
  description?: string
  status?: string
  example_count?: number
  style_data?: { pace?: string; tags?: string[]; notes?: string }
  // camelCase (mock data) or snake_case (DB) — handle both
  exampleCount?: number
  profile?: { pace?: string; preferredTone?: string; salesIntensityBaseline?: string }
}

function Toggle({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub?: string }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', borderRadius: 10, cursor: 'pointer',
      border: `2px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
      background: on ? 'rgba(91,140,255,0.06)' : 'var(--surface2)',
      transition: 'all 0.15s', marginBottom: 10,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{
        width: 40, height: 22, borderRadius: 11,
        background: on ? 'var(--accent)' : 'var(--border)',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: on ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  )
}

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', productName: '', productNotes: '', stylePackId: '', salesIntensity: 3,
  })
  const [editOptions, setEditOptions] = useState<EditOptions>({
    addCaptions: true,
    captionStyle: 'tiktok',
    removeSilence: true,
    silenceThresholdMs: 500,
    tightCuts: true,
    interWordGapMs: 50,
    frameRate: 30,
    removeRepeatedLines: true,
    removeFillerWords: false,
    trimEndPause: true,
  })
  const [loading, setLoading] = useState(false)
  const [stylePacks, setStylePacks] = useState<StylePack[]>([])
  const [packsLoading, setPacksLoading] = useState(true)
  const salesLabels = ['', 'Very Soft', 'Soft', 'Balanced', 'Strong', 'Aggressive']

  // Fetch real style packs from the API, fall back to mock if none exist
  useEffect(() => {
    fetch('/api/style-packs')
      .then(r => r.json())
      .then(d => {
        const real = d.data || []
        // Merge: real packs first, then mock packs that don't conflict
        const realIds = new Set(real.map((p: StylePack) => p.id))
        const mocks = MOCK_STYLE_PACKS.filter(m => !realIds.has(m.id))
        setStylePacks([...real, ...mocks] as StylePack[])
      })
      .catch(() => setStylePacks(MOCK_STYLE_PACKS as StylePack[]))
      .finally(() => setPacksLoading(false))
  }, [])

  function update(field: string, value: any) { setForm(f => ({ ...f, [field]: value })) }
  function updateOpt(field: keyof EditOptions, value: any) { setEditOptions(o => ({ ...o, [field]: value })) }

  async function handleCreate() {
    setLoading(true)
    const projectData = {
      id: `proj_${Date.now()}`,
      name: form.name,
      productName: form.productName,
      productNotes: form.productNotes,
      stylePackId: form.stylePackId || stylePacks[0]?.id || 'sp_1',
      salesIntensity: form.salesIntensity,
      editOptions,
    }
    try { sessionStorage.setItem('clipforge_project', JSON.stringify(projectData)) } catch {}
    router.push(`/projects/${projectData.id}`)
  }

  // Helper: get display tags for a style pack (works for both real DB packs and mock packs)
  function getPackTags(sp: StylePack): string[] {
    if (sp.style_data?.tags?.length) return sp.style_data.tags.slice(0, 3)
    if (sp.profile) return [sp.profile.pace, sp.profile.preferredTone, sp.profile.salesIntensityBaseline].filter(Boolean) as string[]
    return []
  }

  function getPackCount(sp: StylePack): number {
    return sp.example_count ?? sp.exampleCount ?? 0
  }

  const selectedPackName = stylePacks.find(s => s.id === form.stylePackId)?.name || ''

  return (
    <div style={{ padding: '32px 40px', maxWidth: 620 }}>
      <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
        style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Back</button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>New Project</h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>Generate TikTok Shop video edits for your product</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {[1,2,3,4].map(s => (
          <div key={s} style={{ height: 4, flex: 1, borderRadius: 4, background: s <= step ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>

        {/* STEP 1 — Product Info */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 20 }}>📦 Product Info</h2>
            {[['Project Name', 'name', 'e.g. Summer Skincare Launch'], ['Product Name', 'productName', 'e.g. Glow Serum Pro']].map(([label, field, ph]) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{label}</label>
                <input value={(form as any)[field]} onChange={e => update(field, e.target.value)} placeholder={ph}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, marginBottom: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
              Key Benefits <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(bullet points work great)</span>
            </label>
            <textarea value={form.productNotes} onChange={e => update('productNotes', e.target.value)}
              placeholder={'• Clinically tested\n• Results in 7 days\n• Under $30\n• Cruelty free'} rows={4}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <button onClick={() => setStep(2)} disabled={!form.name || !form.productName}
              style={{ marginTop: 20, width: '100%', padding: '12px', borderRadius: 8, background: form.name && form.productName ? 'var(--accent)' : 'var(--border)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: form.name && form.productName ? 'pointer' : 'not-allowed' }}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 2 — Style Pack */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 6 }}>🎨 Style Pack</h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18 }}>Which video style matches your brand?</p>

            {packsLoading ? (
              <div style={{ fontSize: 13, color: 'var(--text3)', padding: '20px 0' }}>Loading style packs...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {stylePacks.filter(sp => sp.status === 'analyzed' || sp.status === 'draft' || !sp.status).map(sp => {
                  const tags = getPackTags(sp)
                  const count = getPackCount(sp)
                  return (
                    <div key={sp.id} onClick={() => update('stylePackId', sp.id)} style={{
                      padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${form.stylePackId === sp.id ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.stylePackId === sp.id ? 'rgba(91,140,255,0.08)' : 'var(--surface2)',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{sp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{count} example{count !== 1 ? 's' : ''}</div>
                      </div>
                      {sp.description && (
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{sp.description}</div>
                      )}
                      {tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {tags.map(tag => (
                            <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(91,140,255,0.12)', color: 'var(--accent)' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div
                  onClick={() => router.push('/styles/new')}
                  style={{
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    border: '2px dashed var(--border)', background: 'transparent',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>+</span>
                  <span style={{ fontSize: 13, color: 'var(--text3)' }}>Create a new style pack</span>
                </div>
              </div>
            )}

            <button onClick={() => setStep(3)} disabled={!form.stylePackId}
              style={{ width: '100%', padding: '12px', borderRadius: 8, background: form.stylePackId ? 'var(--accent)' : 'var(--border)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: form.stylePackId ? 'pointer' : 'not-allowed' }}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 3 — Edit Options */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 6 }}>✂️ Edit Options</h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Control exactly how your video gets edited</p>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Captions</div>
            <Toggle on={editOptions.addCaptions} onClick={() => updateOpt('addCaptions', !editOptions.addCaptions)}
              label="Add captions" sub="Overlay text captions on the video" />

            {editOptions.addCaptions && (
              <div style={{ marginLeft: 16, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Caption style</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([['tiktok', '🔥 TikTok Bold', 'Big animated caps'], ['minimal', '✨ Minimal', 'Clean lower thirds'], ['none', '🚫 Text only', 'No visual style']] as const).map(([val, label, sub]) => (
                    <div key={val} onClick={() => updateOpt('captionStyle', val)} style={{
                      flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      border: `2px solid ${editOptions.captionStyle === val ? 'var(--accent)' : 'var(--border)'}`,
                      background: editOptions.captionStyle === val ? 'rgba(91,140,255,0.08)' : 'var(--surface2)',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, marginTop: 20 }}>Pacing</div>

            <Toggle on={editOptions.tightCuts} onClick={() => updateOpt('tightCuts', !editOptions.tightCuts)}
              label="Tight cuts between speech" sub="Jump-cut every gap between words — no breathing room" />

            {editOptions.tightCuts && (
              <div style={{ marginLeft: 16, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                  Max gap between words: <strong style={{ color: 'var(--accent)' }}>{editOptions.interWordGapMs}ms</strong>
                  {editOptions.interWordGapMs <= 50 && <span style={{ color: '#22c55e', marginLeft: 6 }}>⚡ Ultra tight</span>}
                  {editOptions.interWordGapMs > 50 && editOptions.interWordGapMs <= 100 && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>🔥 Tight</span>}
                  {editOptions.interWordGapMs > 100 && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>Natural</span>}
                </div>
                <input type="range" min={20} max={200} step={10} value={editOptions.interWordGapMs}
                  onChange={e => updateOpt('interWordGapMs', Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                  <span>20ms (robotic)</span><span>200ms (natural)</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Frame rate</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  [15, '15fps', 'TikTok Shop style\nMax punch, no dead frames'],
                  [24, '24fps', 'Cinematic feel\nBalanced & smooth'],
                  [30, '30fps', 'Standard\nSmooth & natural'],
                ] as const).map(([fps, label, desc]) => (
                  <div key={fps} onClick={() => updateOpt('frameRate', fps)} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${editOptions.frameRate === fps ? 'var(--accent)' : 'var(--border)'}`,
                    background: editOptions.frameRate === fps ? 'rgba(91,140,255,0.08)' : 'var(--surface2)',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: editOptions.frameRate === fps ? 'var(--accent)' : 'var(--text)' }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{desc}</div>
                    {fps === 15 && <div style={{ fontSize: 10, color: '#22c55e', marginTop: 4, fontWeight: 700 }}>Recommended</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, marginTop: 20 }}>Cleanup</div>

            <Toggle on={editOptions.removeSilence} onClick={() => updateOpt('removeSilence', !editOptions.removeSilence)}
              label="Cut dead space & silence" sub="Remove pauses longer than threshold" />

            {editOptions.removeSilence && (
              <div style={{ marginLeft: 16, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                  Silence threshold: <strong style={{ color: 'var(--accent)' }}>{editOptions.silenceThresholdMs}ms</strong>
                </div>
                <input type="range" min={200} max={1500} step={100} value={editOptions.silenceThresholdMs}
                  onChange={e => updateOpt('silenceThresholdMs', Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                  <span>Tight (200ms)</span><span>Relaxed (1.5s)</span>
                </div>
              </div>
            )}

            <Toggle on={editOptions.removeRepeatedLines} onClick={() => updateOpt('removeRepeatedLines', !editOptions.removeRepeatedLines)}
              label="Remove repeated lines" sub="Cut when the creator says the same thing twice" />

            <Toggle on={editOptions.removeFillerWords} onClick={() => updateOpt('removeFillerWords', !editOptions.removeFillerWords)}
              label="Remove filler words" sub='Cut "um", "uh", "like", "you know"' />

            <Toggle on={editOptions.trimEndPause} onClick={() => updateOpt('trimEndPause', !editOptions.trimEndPause)}
              label="Trim ending pause" sub="Remove dead frames at the end of the clip" />

            <button onClick={() => setStep(4)} style={{
              marginTop: 20, width: '100%', padding: '12px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            }}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 4 — Sales Intensity + Summary */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 6 }}>🔥 Sales Intensity</h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>How aggressive should the sales tone be?</p>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Soft & Natural</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{salesLabels[form.salesIntensity]}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Aggressive</span>
              </div>
              <input type="range" min={1} max={5} value={form.salesIntensity}
                onChange={e => update('salesIntensity', Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Summary</div>
              {[
                ['Project', form.name],
                ['Product', form.productName],
                ['Style', selectedPackName],
                ['Intensity', salesLabels[form.salesIntensity]],
                ['Captions', editOptions.addCaptions ? `${editOptions.captionStyle === 'tiktok' ? 'TikTok Bold' : editOptions.captionStyle === 'minimal' ? 'Minimal' : 'Text only'}` : 'Off'],
                ['Frame rate', `${editOptions.frameRate}fps${editOptions.frameRate === 15 ? ' ⚡' : ''}`],
                ['Tight cuts', editOptions.tightCuts ? `Yes (max ${editOptions.interWordGapMs}ms gap)` : 'No'],
                ['Cut silence', editOptions.removeSilence ? `Yes (>${editOptions.silenceThresholdMs}ms)` : 'No'],
                ['Cut repeats', editOptions.removeRepeatedLines ? 'Yes' : 'No'],
                ['Cut fillers', editOptions.removeFillerWords ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text3)' }}>{k}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <button onClick={handleCreate} disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              color: '#fff', fontSize: 15, fontWeight: 700, border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 4px 16px rgba(91,140,255,0.4)', opacity: loading ? 0.8 : 1,
            }}>
              {loading ? '⏳ Creating...' : '🚀 Create Project & Upload Footage'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
