import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 指定した開始日〜終了日の日付文字列（YYYY-MM-DD）配列を生成
const expandDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    dates.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    );
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

// ==========================================
// 1. 特別営業日/休業日の一覧取得（本日以降）
// ==========================================
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('business_day_overrides')
      .select('date, is_closed')
      .gte('date', getTodayString())
      .order('date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ overrides: data || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '営業日データの取得に失敗しました。' }, { status: 500 });
  }
}

// ==========================================
// 2. 特別営業日/休業日の登録（単日・期間まとめて）
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { startDate, endDate, is_closed } = body;

    if (!startDate || typeof is_closed !== 'boolean') {
      return NextResponse.json({ error: '必須項目が入力されていません。' }, { status: 400 });
    }

    const dates = expandDateRange(startDate, endDate || startDate);
    if (dates.length === 0) {
      return NextResponse.json({ error: '日付の範囲が不正です。' }, { status: 400 });
    }

    const rows = dates.map((date) => ({ date, is_closed }));

    const { data, error } = await supabase
      .from('business_day_overrides')
      .upsert(rows, { onConflict: 'date' })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, overrides: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '営業日の登録に失敗しました。' }, { status: 500 });
  }
}

// ==========================================
// 3. 特別営業日/休業日の解除（通常の曜日パターンに戻す）
// ==========================================
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: '日付が指定されていません。' }, { status: 400 });
    }

    const { error } = await supabase
      .from('business_day_overrides')
      .delete()
      .eq('date', date);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '解除に失敗しました。' }, { status: 500 });
  }
}
