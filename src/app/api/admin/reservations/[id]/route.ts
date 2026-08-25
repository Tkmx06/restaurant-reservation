import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==========================================
// 予約ステータスの部分更新（PATCH）※管理者用（キャンセル等）
// ==========================================
export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/admin/reservations/[id]'>) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'statusが必要です' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase Update Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reservation: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || '更新に失敗しました' }, { status: 500 });
  }
}

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