import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { findTableConflict } from '@/lib/tableConflict';

// ==========================================
// 予約の部分更新（PATCH）※管理者用（キャンセル・時間/テーブル変更等）
// ==========================================
export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/admin/reservations/[id]'>) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const updateData: any = {};
    if (body.time !== undefined) updateData.time = body.time;
    if (body.guests !== undefined) updateData.guests = Number(body.guests);
    if (body.table_id !== undefined) updateData.table_id = body.table_id;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) updateData.status = body.status;

    // ─── 二重予約防止：卓・時間・結合情報のいずれかが変わる場合、更新後の状態が
    //     他の確定予約（結合テーブル分も含む）と重複しないか確認する ───
    const touchesOccupancy = body.table_id !== undefined || body.time !== undefined || body.notes !== undefined;
    if (touchesOccupancy && body.force !== true) {
      const { data: current, error: fetchError } = await supabase
        .from('reservations')
        .select('date, time, table_id, notes, status')
        .eq('id', id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!current) {
        return NextResponse.json({ error: '対象の予約が見つかりませんでした。' }, { status: 404 });
      }

      const nextStatus = body.status !== undefined ? body.status : current.status;
      if (nextStatus === 'confirmed') {
        const result = await findTableConflict({
          date: current.date,
          time: updateData.time ?? current.time,
          tableId: Number(updateData.table_id ?? current.table_id),
          notes: updateData.notes ?? current.notes,
          excludeReservationId: id,
        });
        if (result.conflict) {
          return NextResponse.json(
            {
              error: `テーブル${result.conflictingTableLabel}は${result.conflictingReservation.guest_name || '他のお客様'}様のご予約（${result.conflictingReservation.time}）と重複しています。`,
            },
            { status: 409 }
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: '対象の予約が見つかりませんでした。' }, { status: 404 });
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
