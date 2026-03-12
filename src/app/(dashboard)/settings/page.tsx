'use client'
import { useState } from 'react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: 'Alex Luckhardt',
    email: 'alex@example.com',
    defaultSalesIntensity: '3',
    defaultStyle: 'high-energy',
    emailNotifications: true,
    exportQuality: 'high',
  })

  function update(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 600 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Settings</h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 28 }}>Manage your account and preferences</p>

      {/* Profile */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 18 }}>👤 Profile</h2>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Name</label>
        <input
          value={form.name}
          onChange={e => update('name', e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, marginBottom: 14,
            outline: 'none', boxSizing: 'border-box'
          }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Email</label>
        <input
          value={form.email}
          onChange={e => update('email', e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface2)', color: 'var(--text)', fontSize: 14,
            outline: 'none', boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Defaults */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 18 }}>⚙️ Generation Defaults</h2>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
          Default Sales Intensity
        </label>
        <select
          value={form.defaultSalesIntensity}
          onChange={e => update('defaultSalesIntensity', e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, marginBottom: 14,
            outline: 'none', boxSizing: 'border-box'
          }}
        >
          <option value="1">1 — Very Soft</option>
          <option value="2">2 — Soft</option>
          <option value="3">3 — Balanced</option>
          <option value="4">4 — Strong</option>
          <option value="5">5 — Aggressive</option>
        </select>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
          Export Quality
        </label>
        <select
          value={form.exportQuality}
          onChange={e => update('exportQuality', e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface2)', color: 'var(--text)', fontSize: 14,
            outline: 'none', boxSizing: 'border-box'
          }}
        >
          <option value="draft">Draft (720p, faster)</option>
          <option value="high">High (1080p)</option>
          <option value="ultra">Ultra (4K, slower)</option>
        </select>
      </div>

      {/* Notifications */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 0, marginBottom: 18 }}>🔔 Notifications</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Email notifications</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Get notified when exports are ready</div>
          </div>
          <div
            onClick={() => update('emailNotifications', !form.emailNotifications)}
            style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
              background: form.emailNotifications ? 'var(--accent)' : 'var(--border)',
              position: 'relative', flexShrink: 0
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3, transition: 'left 0.2s',
              left: form.emailNotifications ? 23 : 3
            }} />
          </div>
        </div>
      </div>

      {/* Plan */}
      <div style={{ background: 'linear-gradient(135deg, rgba(91,140,255,0.12), rgba(139,92,246,0.12))', border: '1px solid var(--accent)', borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>⚡ Pro Plan</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>Unlimited projects · AI generation · Priority export</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'var(--accent)', color: '#fff' }}>Active</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        style={{
          width: '100%', padding: '12px', borderRadius: 8,
          background: saved ? '#4ade80' : 'var(--accent)',
          color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
          transition: 'background 0.3s'
        }}
      >
        {saved ? '✓ Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
