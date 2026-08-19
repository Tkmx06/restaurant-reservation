import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==========================================
// 1. 予約データの取得（GET）
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const filter = req.nextUrl.searchParams.get('filter') || 'all';
    const targetDate = req.nextUrl.searchParams.get('date');

    let query = supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (targetDate) {
      query = query.eq('date', targetDate);
    } else if (filter === 'upcoming') {
      const localToday = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date()).replace(/\//g, '-');

      query = query.gte('date', localToday);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ reservations: data || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '予約データの取得に失敗しました。' }, { status: 500 });
  }
}

// ==========================================
// 2. 手動での新規登録（POST）※管理者用
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { guest_name, date, time, guests, table_id, notes, email, phone } = body;

    if (!guest_name || !date || !time || !table_id) {
      return NextResponse.json({ error: '必須項目（名前、日付、時間、テーブル）が不足しています' }, { status: 400 });
    }

    // データベースの空欄不可エラー（NOT NULL制約）を防ぐための補正処理 [1]
    const { data, error } = await supabase
      .from('reservations')
      .insert([
        {
          guest_name,
          date,
          time,
          guests: Number(guests) || 2,
          table_id,
          notes: notes || '',
          status: 'confirmed',
          email: email || 'customer@example.com',
          phone: phone || '-', // 電話番号が空欄の場合はハイフンを自動補完 [1]
          visit_count: 1
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reservation: data });
  } catch (err: any) {
    console.error('API Catch Error:', err);
    return NextResponse.json({ error: err.message || '登録に失敗しました' }, { status: 500 });
  }
}

// ==========================================
// 3. 予約の更新（PUT）※管理者用
// ==========================================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, time, guests, table_id, notes, status } = body;

    if (!id) {
      return NextResponse.json({ error: '予約IDが必要です' }, { status: 400 });
    }

    const updateData: any = {};
    if (time !== undefined) updateData.time = time;
    if (guests !== undefined) updateData.guests = Number(guests);
    if (table_id !== undefined) updateData.table_id = table_id;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
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