// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseBrowser = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, anon, {
    auth: { persistSession: true }, // ถ้าจะทำ auth ฝั่ง client
  })
}
