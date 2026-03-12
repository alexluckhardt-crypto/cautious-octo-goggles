// src/components/layout/DashboardClient.tsx
'use client'
import Link from 'next/link'
import type { StylePack, Project } from '@/types'
import { SALES_INTENSITY_LABELS } from '@/types'

interface Props {
  stylePacks: StylePack[]
  projects: Project[]
}

export default function DashboardClient({ stylePacks, projects }: Props) {
  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>Dashboard</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>Welcome back — ready to create?</p>
        </div>
        <Link href="/projects/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, background: 'var(--accent)', color: 'white', textDecoration: 'none' }}>
          + New Project
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Style Packs', value: stylePacks.length, icon: '🎨', color: 'var(--accent)' },
          { label: 'Projects', value: projects.length, icon: '🎬', color: 'var(--purple)' },
          { label: 'Hooks Generated', value: 47, icon: '🔥', color: 'var(--red)' },
          { label: 'Exports Ready', value: 3, icon: '📦', color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Projects */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700 }}>Recent Projects</h2>
            <Link href="/projects" style={{ fontSize: 12, color: 'var(--text2)', textDecoration: 'none' }}>View all</Link>
          </div>
          {projects.slice(0, 3).length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 12 }}>No projects yet</p>
              <Link href="/projects/new" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Create your first →</Link>
            </div>
          ) : projects.slice(0, 3).map(p => (
            <Link key={p.id} href={`/projects/${p.id}`} style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 10, textDecoration: 'none', transition: 'border-color 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{p.name}</span>
                    <span style={{ background: p.status === 'generated' ? 'rgba(61,255,160,0.12)' : 'rgba(255,213,77,0.12)', color: p.status === 'generated' ? 'var(--green)' : 'var(--yellow)', border: `1px solid ${p.status === 'generated' ? 'rgba(61,255,160,0.25)' : 'rgba(255,213,77,0.25)'}`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{p.productName}</div>
                </div>
                <span style={{ color: 'var(--text3)' }}>→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Style Packs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700 }}>Style Library</h2>
            <Link href="/styles" style={{ fontSize: 12, color: 'var(--text2)', textDecoration: 'none' }}>View all</Link>
          </div>
          {stylePacks.map(sp => (
            <Link key={sp.id} href={`/styles/${sp.id}`} style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 10, textDecoration: 'none', transition: 'border-color 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{sp.name}</span>
                    <span style={{ background: 'rgba(61,255,160,0.12)', color: 'var(--green)', border: '1px solid rgba(61,255,160,0.25)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>analyzed</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{sp.exampleCount} examples</div>
                </div>
                <span style={{ color: 'var(--text3)' }}>→</span>
              </div>
            </Link>
          ))}
          <Link href="/styles/new" style={{ display: 'block', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 12, padding: '11px 18px', textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: 'var(--text2)', textDecoration: 'none', marginTop: 4 }}>
            + Create Style Pack
          </Link>
        </div>
      </div>
    </div>
  )
}
