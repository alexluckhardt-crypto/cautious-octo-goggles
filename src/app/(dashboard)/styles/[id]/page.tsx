'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface StylePack {
  id: string
  name: string
  description: string
  status: 'draft' | 'analyzing' | 'analyzed' | 'failed'
  example_count: number
  created_at: string
  style_data?: StyleData
}

interface StyleData {
  cuts_per_30s: number
  urgency_score: number
  authenticity_score: number
  confidence_score: number
  pace: string
  caption_style: string
  tags: string[]
  notes: string
  total_videos_analyzed: number
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
        <div style={{ height: 6, background: 'var(--accent)', borderRadius: 3, width: `${value}%`, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function StyleDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pack, setPack] = useState<StylePack | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/style-packs')
      .then(r => r.json())
      .then(d => {
        const found = (d.data || []).find((p: StylePack) => p.id === id)
        setPack(found || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  // Poll while analyzing
  useEffect(() => {
    if (pack?.status !== 'analyzing') return
    const timer = setTimeout(() => {
      fetch('/api/style-packs')
        .then(r => r.json())
        .then(d => {
          const found = (d.data || []).find((p: StylePack) => p.id === id)
          if (found) setPack(found)
        })
    }, 4000)
    return () => clearTimeout(timer)
  }, [pack, id])

  async function uploadVideo(file: File): Promise<string> {
    const urlRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type || 'video/mp4' }),
    })
    const uploadData = await urlRes.json()
    if (!urlRes.ok) throw new Error(`Upload URL failed: ${uploadData.error || urlRes.status}`)

    if (uploadData.signedUrl) {
      const res = await fetch(uploadData.signedUrl, {
        method: 'PUT', headers: { 'Content-Type': file.type || 'video/mp4' }, body: file,
      })
      if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text().then(t => t.slice(0,200))}`)
      return uploadData.publicUrl
    } else if (uploadData.directUrl && uploadData.serviceKey) {
      const res = await fetch(uploadData.directUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${uploadData.serviceKey}`, 'Content-Type': file.type || 'video/mp4', 'x-upsert': 'true' },
        body: file,
      })
      if (!res.ok) throw new Error(`Direct upload failed (${res.status}): ${await res.text().then(t => t.slice(0,200))}`)
      return uploadData.publicUrl
    }
    throw new Error(uploadData.error || 'No upload URL returned')
  }

  async function handleAddVideos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 3)
    if (!files.length || !pack) return
    setUploading(true); setError(''); setProgress(0)

    try {
      const videoUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        setStatus(`Uploading video ${i + 1} of ${files.length}...`)
        setProgress(Math.round(((i) / files.length) * 40))
        const url = await uploadVideo(files[i])
        if (url) videoUrls.push(url)
      }

      if (videoUrls.length === 0) throw new Error('Failed to upload videos')

      setStatus(`🤖 Analyzing ${videoUrls.length} new video${videoUrls.length > 1 ? 's' : ''}...`)
      setProgress(50)

      const res = await fetch(`/api/style-packs/${pack.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls, merge: true }),
      })

      setProgress(95)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setStatus('✅ Style pack updated!')
      setProgress(100)

      // Reload pack data
      const refreshRes = await fetch('/api/style-packs')
      const refreshData = await refreshRes.json()
      const updated = (refreshData.data || []).find((p: StylePack) => p.id === id)
      if (updated) setPack(updated)

      setUploading(false)
      setStatus('')
      setProgress(0)
    } catch (err: any) {
      setError(err.message)
      setUploading(false)
    }

    e.target.value = ''
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)' }}>Loading...</div>
  if (!pack) return (
    <div style={{ padding: 40 }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>← Back</button>
      <p style={{ color: 'var(--text3)' }}>Style pack not found.</p>
    </div>
  )

  const sd = pack.style_data

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800 }}>
      <button onClick={() => router.back()} style={{
        background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13,
        cursor: 'pointer', padding: 0, marginBottom: 16
      }}>← Back to Style Library</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{pack.name}</h1>
          {pack.description && <p style={{ fontSize: 14, color: 'var(--text3)', marginTop: 4 }}>{pack.description}</p>}
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            {sd?.total_videos_analyzed
              ? `${sd.total_videos_analyzed} video${sd.total_videos_analyzed !== 1 ? 's' : ''} analyzed total`
              : pack.example_count > 0 ? `${pack.example_count} video${pack.example_count !== 1 ? 's' : ''}`
              : 'No videos analyzed yet'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
            background: pack.status === 'analyzed' ? 'rgba(34,197,94,0.15)' :
                        pack.status === 'analyzing' ? 'rgba(251,191,36,0.15)' : 'rgba(148,163,184,0.15)',
            color: pack.status === 'analyzed' ? '#22c55e' :
                   pack.status === 'analyzing' ? '#fbbf24' : '#94a3b8'
          }}>{pack.status === 'analyzing' ? 'analyzing...' : pack.status}</span>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mov,.mp4,.avi,.mkv,.webm,.m4v"
            multiple
            style={{ display: 'none' }}
            onChange={handleAddVideos}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || pack.status === 'analyzing'}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? '⏳ Processing...' : '+ Add More Videos'}
          </button>
        </div>
      </div>

      {/* Progress bar while uploading/analyzing */}
      {uploading && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>{status}</div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {pack.status === 'analyzing' && !uploading && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#fbbf24' }}>
          ⏳ AI is analyzing your videos... this page will update automatically.
        </div>
      )}

      {!sd && pack.status !== 'analyzing' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>No videos analyzed yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            Add example TikTok videos to build this style pack's AI profile
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            + Add Videos
          </button>
        </div>
      )}

      {sd && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Scores */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 16 }}>Style Scores</h3>
            <ScoreBar label="Urgency" value={sd.urgency_score} />
            <ScoreBar label="Authenticity" value={sd.authenticity_score} />
            <ScoreBar label="Confidence" value={sd.confidence_score} />
          </div>

          {/* Metrics */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 16 }}>Video Metrics</h3>
            {[
              ['Cuts per 30s', sd.cuts_per_30s],
              ['Pace', sd.pace?.replace('_', ' ')],
              ['Caption Style', sd.caption_style],
            ].map(([k, v]) => (
              <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: 'var(--text3)' }}>{k}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'capitalize' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          {sd.tags?.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 14 }}>Style Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sd.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: 'rgba(91,140,255,0.15)', color: 'var(--accent)'
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {sd.notes && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 10 }}>AI Summary</h3>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, margin: 0 }}>{sd.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
