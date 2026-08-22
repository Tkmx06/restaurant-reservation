import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 予約一覧データの取得（既存の機能）
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

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ reservations: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '予約データの取得に失敗しました。' }, { status: 500 });
  }
}

// 予約内容の更新（テーブル移動・人数変更など）
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { table_id, guests, status, date, time, notes } = body;

    const updateData: any = {};
    if (table_id !== undefined) updateData.table_id = table_id;
    if (guests !== undefined) updateData.guests = guests;
    if (status !== undefined) updateData.status = status;
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, reservation: data });
  } catch (err: any) {
    console.error('予約更新エラー:', err);
    return NextResponse.json({ error: '予約の更新に失敗しました。' }, { status: 500 });
  }
}

// 予約の削除（キャンセル）
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('予約削除エラー:', err);
    return NextResponse.json({ error: '予約キャンセル処理に失敗しました。' }, { status: 500 });
  }
}