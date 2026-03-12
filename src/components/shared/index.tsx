'use client'
// src/components/shared/index.tsx
// Reusable UI primitives used across the app
import { useEffect, useRef, useState } from 'react'

// ─── Score Bar ────────────────────────────────────────────────────────────────
export function ScoreBar({ value, color = 'var(--accent)', height = 6 }: { value: number; color?: string; height?: number }) {
  return (
    <div style={{ height, background: 'var(--surface3)', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.8s ease' }} />
    </div>
  )
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
export function ScoreRing({ value, size = 64, color = 'var(--accent)' }: { value: number; size?: number; color?: string }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface3)" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <span style={{ position: 'absolute', fontSize: size * 0.22, fontWeight: 800, fontFamily: 'Syne, sans-serif', color }}>{value}</span>
    </div>
  )
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
export function UploadZone({ label, hint, accept, onFiles }: { label?: string; hint?: string; accept?: string; onFiles?: (files: File[]) => void }) {
  const [files, setFiles] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handle(fileList: FileList | null) {
    if (!fileList) return
    const arr = Array.from(fileList)
    setFiles(prev => [...prev, ...arr.map(f => f.name)])
    onFiles?.(arr)
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files) }}
        style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', background: dragging ? 'rgba(91,140,255,0.04)' : 'transparent' }}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{label || 'Drop files or click to upload'}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{hint || 'MP4, MOV up to 2GB'}</div>
        <input ref={inputRef} type="file" accept={accept} multiple style={{ display: 'none' }} onChange={e => handle(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {files.map((f, i) => (
            <span key={i} style={{ background: 'rgba(91,140,255,0.12)', color: 'var(--accent)', border: '1px solid rgba(91,140,255,0.25)', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>📎 {f}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sales Intensity Slider ───────────────────────────────────────────────────
const SALES_LABELS = ['Organic', 'Light Sell', 'Balanced', 'Strong Sell', 'Aggressive Close']

export function SalesSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <input
        type="range" min={0} max={4} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', height: 6, borderRadius: 3, outline: 'none', cursor: 'pointer', background: `linear-gradient(to right, var(--accent) ${value * 25}%, var(--surface3) ${value * 25}%)`, WebkitAppearance: 'none', appearance: 'none' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {SALES_LABELS.map((l, i) => (
          <span key={i} style={{ fontSize: 10, color: i === value ? 'var(--accent)' : 'var(--text3)', fontWeight: i === value ? 700 : undefined }}>{l}</span>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <span style={{ background: 'rgba(91,140,255,0.12)', color: 'var(--accent)', border: '1px solid rgba(91,140,255,0.25)', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>
          {SALES_LABELS[value]}
        </span>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onDone }: { message: string; type?: 'success' | 'error' | 'info'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  const colors = { success: 'var(--green)', error: 'var(--red)', info: 'var(--accent)' }
  const icons = { success: '✓', error: '✕', info: 'ℹ' }
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 12, padding: '14px 18px', fontSize: 13.5, fontWeight: 500, zIndex: 999, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'slideIn 0.2s ease' }}>
      <span style={{ color: colors[type], fontWeight: 700, fontSize: 16 }}>{icons[type]}</span>
      {message}
    </div>
  )
}

// ─── Processing State ─────────────────────────────────────────────────────────
export function ProcessingState({ label, steps }: { label?: string; steps?: string[] }) {
  const defaultSteps = ['Analyzing style examples', 'Extracting style signature', 'Generating hooks', 'Building edit plans', 'Preparing variants']
  const displaySteps = steps || defaultSteps
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: 12 }}>{label || 'Processing...'}</h2>
      <p style={{ fontSize: 13.5, color: 'var(--text2)', marginBottom: 20 }}>This may take a moment.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300, margin: '0 auto' }}>
        {displaySteps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i < 3 ? 1 : 0.4 }}>
            <span style={{ fontSize: 14, color: i < 3 ? 'var(--green)' : 'var(--text3)' }}>{i < 3 ? '✓' : '○'}</span>
            <span style={{ fontSize: 13, color: i < 3 ? 'var(--green)' : i === 3 ? 'var(--text)' : 'var(--text3)' }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, background: i < current ? 'var(--green)' : i === current ? 'var(--accent)' : 'var(--surface3)', color: i < current ? 'var(--bg)' : i === current ? 'white' : 'var(--text3)', border: i > current ? '1px solid var(--border2)' : 'none' }}>
            {i < current ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: i === current ? 'var(--text)' : 'var(--text2)', marginLeft: 8, whiteSpace: 'nowrap' }}>{s}</span>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 12px' }} />}
        </div>
      ))}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub, action, actionHref }: { icon: string; title: string; sub: string; action?: string; actionHref?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: 'var(--text3)', marginBottom: 24 }}>{sub}</p>
      {action && actionHref && (
        <a href={actionHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, background: 'var(--accent)', color: 'white', textDecoration: 'none' }}>
          {action}
        </a>
      )}
    </div>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
export function Topbar({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, position: 'sticky', top: 0, zIndex: 50 }}>
      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, flex: 1 }}>{title}</span>
      {children}
    </div>
  )
}
