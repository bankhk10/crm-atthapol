// app/api/supabase-test/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export const runtime = 'nodejs' // ให้รันฝั่ง Node (ไม่ใช่ edge)

export async function GET() {
  try {
    const supabase = supabaseServer()

    // 1) เขียน 1 แถวลงตาราง
    const insertRes = await supabase
      .from('pings')
      .insert({ note: 'hello from next_mui test' })
      .select('id, created_at')
      .single()

    if (insertRes.error) {
      return NextResponse.json(
        { ok: false, stage: 'insert', error: insertRes.error.message },
        { status: 500 }
      )
    }

    // 2) อ่านจำนวนแถวทั้งหมดกลับมา
    const countRes = await supabase
      .from('pings')
      .select('*', { count: 'exact', head: true })

    if (countRes.error) {
      return NextResponse.json(
        { ok: false, stage: 'count', error: countRes.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      inserted: insertRes.data,
      totalRows: countRes.count ?? 0,
      hint: 'ถ้าเห็น ok:true แปลว่าต่อ Supabase สำเร็จ',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
