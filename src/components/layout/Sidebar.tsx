// src/components/layout/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬛', href: '/dashboard' },
  { section: 'Create' },
  { id: 'new-project', label: 'New Project', icon: '＋', href: '/projects/new' },
  { id: 'new-style', label: 'New Style Pack', icon: '🎨', href: '/styles/new' },
  { section: 'Library' },
  { id: 'styles', label: 'Style Library', icon: '📚', href: '/styles' },
  { id: 'projects', label: 'Projects', icon: '🎬', href: '/projects' },
  { section: 'Account' },
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
]

interface SidebarProps {
  user: { name: string; email: string }
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    if (supabase) await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 0', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: -0.3 }}>CLIPFORGE AI</div>
        <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>TikTok Shop Editor</div>
      </div>

      {/* Nav */}
      {NAV.map((item, i) => {
        if ('section' in item) {
          return (
            <div key={i} style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '16px 20px 6px' }}>
              {item.section}
            </div>
          )
        }
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        return (
          <Link
            key={i}
            href={item.href}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', cursor: 'pointer', color: isActive ? 'var(--accent)' : 'var(--text2)', fontSize: 13.5, fontWeight: 500, textDecoration: 'none', borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`, background: isActive ? 'rgba(91,140,255,0.08)' : 'transparent', transition: 'all 0.15s' }}
          >
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}

      {/* User footer */}
      <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Pro Plan</div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{ fontSize: 12, color: 'var(--text3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
