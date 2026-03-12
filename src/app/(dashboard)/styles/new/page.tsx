'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MAX_VIDEOS = 3
const MAX_SIZE_MB = 150

export default function NewStylePackPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', description: '' })
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const valid = Array.from(incoming)
      .filter(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i))
      .filter(f => f.size <= MAX_SIZE_MB * 1024 * 1024)
    const combined = [...files, ...valid].slice(0, MAX_VIDEOS)
    setFiles(combined)
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  function fmtSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function uploadVideo(file: File): Promise<string | null> {
    // Get signed upload URL from our API
    const urlRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type || 'video/mp4' }),
    })
    const uploadData = await urlRes.json()
    if (!urlRes.ok) throw new Error(`Upload URL failed: ${uploadData.error || urlRes.status}`)

    if (uploadData.signedUrl) {
      const uploadRes = await fetch(uploadData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'video/mp4' },
        body: file,
      })
      if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        throw new Error(`Supabase upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`)
      }
      return uploadData.publicUrl
    } else if (uploadData.directUrl && uploadData.serviceKey) {
      const uploadRes = await fetch(uploadData.directUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${uploadData.serviceKey}`,
          'Content-Type': file.type || 'video/mp4',
          'x-upsert': 'true',
        },
        body: file,
      })
      if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        throw new Error(`Direct upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`)
      }
      return uploadData.publicUrl
    } else if (uploadData.error) {
      throw new Error(`Storage error: ${uploadData.error}`)
    }
    throw new Error('No upload URL returned from server')
  }

  async function handleCreate() {
    if (!form.name || files.length === 0) return
    setLoading(true); setError(''); setProgress(0)

    try {
      // Step 1: Create the style pack record
      setStatus('Creating style pack...')
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('description', form.description)
      const res = await fetch('/api/style-packs', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create style pack')
      }
      const { data: pack } = await res.json()

      // Step 2: Upload videos to Supabase storage
      const videoUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        setStatus(`Uploading video ${i + 1} of ${files.length}...`)
        setProgress(Math.round(((i) / files.length) * 50))
        const url = await uploadVideo(files[i])
        if (url) videoUrls.push(url)
      }
      setProgress(50)

      if (videoUrls.length === 0) {
        // Try a direct test upload to see what error we get
        const testRes = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'test.mp4', fileType: 'video/mp4' }),
        })
        const testData = await testRes.json()
        if (!testRes.ok || testData.error) {
          throw new Error(`Storage not configured: ${testData.error || testRes.status}`)
        }
        throw new Error('Videos uploaded to storage URL but upload failed. Check that uploads bucket is public and has policies set.')
      }

      // Step 3: Trigger AI analysis
      setStatus(`🤖 AI analyzing ${videoUrls.length} video${videoUrls.length > 1 ? 's' : ''}... (this takes ~30-60 seconds)`)
      setProgress(60)

      const analyzeRes = await fetch(`/api/style-packs/${pack.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls }),
      })

      setProgress(95)
      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) {
        const detail = analyzeData.details?.join('; ') || analyzeData.error || 'Unknown error'
        throw new Error(`Analysis failed: ${detail}`)
      } else {
        setStatus('✅ Style pack analyzed and saved!')
      }

      setProgress(100)
      await new Promise(r => setTimeout(r, 1200))
      router.push('/styles')
    } catch (err: any) {
      setError(err.message)
      setStatus('')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 600 }}>
      <button onClick={() => router.back()} style={{
        background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13,
        cursor: 'pointer', padding: 0, marginBottom: 12
      }}>← Back</button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>New Style Pack</h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 28 }}>
        Upload up to 3 example TikTok videos — AI will analyze the style automatically
      </p>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Pack Name</label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. High Energy Product Demos"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
          Description <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(optional)</span>
        </label>
        <input
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Fast cuts, bold captions, aggressive CTAs"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, marginBottom: 24, outline: 'none', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
          Example Videos
        </label>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, margin: '0 0 10px' }}>
          Upload 1–3 TikToks that represent the style you want. Max {MAX_SIZE_MB}MB each.
        </p>

        {files.length < MAX_VIDEOS && (
          <label
            style={{
              display: 'block',
              border: `2px dashed ${files.length > 0 ? '#22c55e' : 'var(--border)'}`,
              borderRadius: 12, padding: '28px 20px', textAlign: 'center',
              background: 'var(--surface2)', cursor: 'pointer', marginBottom: 12,
            }}
          >
            <input
              type="file"
              accept="video/*,.mov,.mp4,.avi,.mkv,.webm,.m4v,.MOV,.MP4"
              multiple
              style={{ display: 'none' }}
              onChange={e => { handleFiles(e.target.files); e.currentTarget.value = '' }}
            />
            <div style={{ fontSize: 28, marginBottom: 6 }}>🎬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
              {files.length === 0 ? 'Add example videos' : `Add more (${files.length}/${MAX_VIDEOS})`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>MP4 or MOV, up to {MAX_SIZE_MB}MB each</div>
          </label>
        )}

        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🎬</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtSize(f.size)}</div>
                  </div>
                </div>
                <button onClick={e => { e.preventDefault(); removeFile(i) }} style={{
                  background: 'none', border: 'none', color: 'var(--text3)',
                  cursor: 'pointer', fontSize: 18, padding: '0 4px'
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        {loading && progress > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{status}</div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!form.name || files.length === 0 || loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 8,
            background: form.name && files.length > 0 && !loading ? 'var(--accent)' : 'var(--border)',
            color: '#fff', fontSize: 14, fontWeight: 600, border: 'none',
            cursor: form.name && files.length > 0 && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? `⏳ ${status || 'Processing...'}` : `🎨 Create & Analyze Style Pack`}
        </button>
      </div>
    </div>
  )
}
