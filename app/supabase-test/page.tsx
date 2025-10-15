'use client'

import { useState } from 'react'

export default function SupabaseTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/supabase-test')
      const json = await res.json()
      setResult(json)
    } catch (e: any) {
      setResult({ ok: false, error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Supabase Connection Test</h1>
      <p>กดปุ่มเพื่อลอง insert + count ในตาราง <code>pings</code></p>
      <button onClick={run} disabled={loading} style={{ padding: '8px 16px' }}>
        {loading ? 'Testing…' : 'Run Test'}
      </button>
      <pre style={{ marginTop: 16, background: '#111', color: '#0f0', padding: 16, borderRadius: 8 }}>
        {result ? JSON.stringify(result, null, 2) : 'No result yet'}
      </pre>
    </div>
  )
}
