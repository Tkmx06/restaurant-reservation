import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const filter = req.nextUrl.searchParams.get('filter') || 'upcoming';
    const dateParam = req.nextUrl.searchParams.get('date');

    let query = supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    const today = new Date().toISOString().split('T')[0];

    if (filter === 'today') {
      query = query.eq('date', today);
    } else if (filter === 'date' && dateParam) {
      query = query.eq('date', dateParam);
    } else if (filter === 'upcoming') {
      query = query.gte('date', today);
    }
    // filter === 'all' の場合は絞り込みなし

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ reservations: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '予約データの取得に失敗しました。' }, { status: 500 });
  }
}