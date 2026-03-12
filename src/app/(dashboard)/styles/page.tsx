'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface StylePack {
  id: string
  name: string
  description: string
  status: 'draft' | 'analyzing' | 'analyzed' | 'failed'
  example_count: number
  created_at: string
}

export default function StylesPage() {
  const router = useRouter()
  const [packs, setPacks] = useState<StylePack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/style-packs')
      .then(r => r.json())
      .then(d => { setPacks(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Poll for analyzing packs
  useEffect(() => {
    const analyzing = packs.some(p => p.status === 'analyzing')
    if (!analyzing) return
    const timer = setTimeout(() => {
      fetch('/api/style-packs')
        .then(r => r.json())
        .then(d => setPacks(d.data || []))
    }, 5000)
    return () => clearTimeout(timer)
  }, [packs])

  function statusBadge(status: string) {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      analyzed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'analyzed' },
      analyzing: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'analyzing...' },
      draft: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'draft' },
      failed: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: 'failed' },
    }
    const s = styles[status] || styles.draft
    return (
      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    )
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Style Library</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            {loading ? 'Loading...' : `${packs.length} style pack${packs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => router.push('/styles/new')}
          style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          + New Style Pack
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading style packs...</div>
      ) : packs.length === 0 ? (
        <div
          onClick={() => router.push('/styles/new')}
          style={{
            border: '2px dashed var(--border)', borderRadius: 14, padding: '48px 32px',
            textAlign: 'center', cursor: 'pointer', maxWidth: 400,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎨</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No style packs yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Upload example TikToks to create your first style</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {packs.map(pack => (
            <div
              key={pack.id}
              onClick={() => router.push(`/styles/${pack.id}`)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 24, cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{pack.name}</h3>
                {statusBadge(pack.status)}
              </div>
              {pack.description && (
                <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 14px', lineHeight: 1.5 }}>{pack.description}</p>
              )}
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {pack.status === 'analyzing' ? '⏳ AI is analyzing your videos...' :
                 pack.status === 'failed' ? '❌ Analysis failed — try again' :
                 pack.example_count > 0 ? `${pack.example_count} example video${pack.example_count !== 1 ? 's' : ''}` :
                 'No videos yet'}
              </div>
            </div>
          ))}

          <div
            onClick={() => router.push('/styles/new')}
            style={{
              border: '2px dashed var(--border)', borderRadius: 14, padding: 24,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', minHeight: 140, gap: 8,
            }}
          >
            <span style={{ fontSize: 28 }}>+</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>New Style Pack</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Upload example videos to analyze</span>
          </div>
        </div>
      )}
    </div>
  )
}
