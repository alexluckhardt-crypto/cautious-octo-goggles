'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MOCK_PROJECTS, MOCK_STYLE_PACKS } from '@/lib/mockData'

const STATUS_COLORS: Record<string, string> = {
  generated: '#4ade80',
  processing: '#facc15',
  draft: '#94a3b8',
  error: '#f87171',
  ready: '#60a5fa',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState(MOCK_PROJECTS)
  const [stylePacks, setStylePacks] = useState(MOCK_STYLE_PACKS)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { if (data?.data?.length) setProjects(data.data) })
      .catch(() => {})
    fetch('/api/style-packs')
      .then(r => r.json())
      .then(data => { if (data?.data?.length) setStylePacks(data.data) })
      .catch(() => {})
  }, [])
  const [search, setSearch] = useState('')

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.productName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Projects</h1>
          <p style={{ fontSize: 14, color: 'var(--text3)', marginTop: 4 }}>{projects.length} total projects</p>
        </div>
        <Link href="/projects/new" style={{
          background: 'var(--accent)', color: '#fff', padding: '10px 20px',
          borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          + New Project
        </Link>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search projects..."
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, marginBottom: 20,
          outline: 'none', boxSizing: 'border-box'
        }}
      />

      {/* Project cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>No projects yet</div>
          <div style={{ fontSize: 14, marginTop: 6, marginBottom: 20 }}>Create your first TikTok Shop video project</div>
          <Link href="/projects/new" style={{
            background: 'var(--accent)', color: '#fff', padding: '10px 20px',
            borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none'
          }}>+ New Project</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(project => {
            const stylePack = stylePacks.find((s: any) => s.id === project.stylePackId)
            return (
              <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                  padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16,
                  cursor: 'pointer', transition: 'border-color 0.15s'
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0
                  }}>🎬</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{project.name}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: `${STATUS_COLORS[project.status]}22`,
                        color: STATUS_COLORS[project.status], textTransform: 'capitalize'
                      }}>{project.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                      {project.productName}
                      {stylePack && <span> · {stylePack.name}</span>}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text3)', flexShrink: 0 }}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 18 }}>→</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
