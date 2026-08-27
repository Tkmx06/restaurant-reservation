import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// お客様向け予約ページ用：指定日にオンライン予約に開放されているテーブル一覧
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date');
    if (!date) {
      return NextResponse.json({ openTables: [] });
    }

    const { data, error } = await supabase
      .from('online_table_overrides')
      .select('table_label')
      .eq('date', date)
      .eq('is_open', true);

    if (error) throw error;

    return NextResponse.json({ openTables: (data || []).map((d) => d.table_label) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '設定の取得に失敗しました。' }, { status: 500 });
  }
}
