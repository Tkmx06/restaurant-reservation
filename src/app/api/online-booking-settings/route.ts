import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// お客様向け予約ページ用：現在オンライン予約に開放されているテーブル一覧
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('online_booking_settings')
      .select('table_label')
      .eq('is_open', true);

    if (error) throw error;

    return NextResponse.json({ openTables: (data || []).map((d) => d.table_label) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '設定の取得に失敗しました。' }, { status: 500 });
  }
}
