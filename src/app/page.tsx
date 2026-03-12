// src/app/page.tsx
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>CLIPFORGE AI</div>
          <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>TikTok Shop Editor</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/sign-in" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text2)', border: '1px solid var(--border)', textDecoration: 'none' }}>
            Sign In
          </Link>
          <Link href="/sign-up" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: 'white', textDecoration: 'none' }}>
            Get Started →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '100px 40px 80px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(91,140,255,0.1)', border: '1px solid rgba(91,140,255,0.2)', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 24 }}>
          ✦ AI-Powered TikTok Shop Editor
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 56, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, marginBottom: 20, background: 'linear-gradient(135deg, #fff 30%, #5b8cff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Your editing style.<br />Infinitely scalable.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text2)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Upload your best-performing edits. ClipForge learns your exact style — pacing, cuts, captions, hooks — then reproduces it on any new footage, automatically.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/sign-up" style={{ padding: '13px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, background: 'var(--accent)', color: 'white', textDecoration: 'none' }}>
            Start Free →
          </Link>
          <Link href="/sign-in" style={{ padding: '13px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, color: 'var(--text2)', border: '1px solid var(--border)', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 72, flexWrap: 'wrap' }}>
          {[
            ['🎯', 'Style Packs', 'Train on your own edited examples'],
            ['⚡', '4 Variants', 'Auto-generate conversion-tuned cuts'],
            ['🔥', '10 Hooks', 'AI hook options per project'],
            ['📊', 'Scorecard', 'Visual breakdown of your editing DNA'],
          ].map(([icon, title, sub]) => (
            <div key={title} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
