import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { data: allTables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .order('id', { ascending: true });
    if (tablesError) throw tablesError;

    const { data: dayReservations, error: resError } = await supabase
      .from('reservations')
      .select('table_id, time, guest_name, guests, status')
      .eq('date', date)
      .eq('status', 'confirmed');
    if (resError) throw resError;

    const tablesWithStatus = (allTables || []).map((tbl) => {
      const usage = (dayReservations || []).filter((r) => r.table_id === tbl.id);
      return {
        ...tbl,
        isOccupied: usage.length > 0,
        reservations: usage,
      };
    });

    return NextResponse.json({ tables: tablesWithStatus, date });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'テーブル状況の取得に失敗しました。' }, { status: 500 });
  }
}