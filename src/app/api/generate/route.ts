import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Use /api/process-video instead' }, { status: 400 })
}
