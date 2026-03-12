// src/app/(auth)/sign-up/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    if (!supabase) {
      router.push('/dashboard')
      return
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'radial-gradient(ellipse at 50% 0%, rgba(91,140,255,0.12) 0%, transparent 60%), var(--bg)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>CLIPFORGE AI</div>
          <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>TikTok Shop Editor</div>
        </div>

        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>Create account</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text3)', textAlign: 'center', marginBottom: 28 }}>Start building your style library</p>

        <form onSubmit={handleSignUp}>
          {[
            { label: 'Name', type: 'text', value: name, onChange: setName, placeholder: 'Alex Creator' },
            { label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'you@example.com' },
            { label: 'Password', type: 'password', value: password, onChange: setPassword, placeholder: '••••••••' },
          ].map(field => (
            <div key={field.label} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>{field.label}</label>
              <input
                type={field.type}
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                required
                style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--text)', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
              />
            </div>
          ))}

          {error && (
            <div style={{ background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.7 : 1, marginTop: 4 }}
          >
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
        <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/sign-in" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
