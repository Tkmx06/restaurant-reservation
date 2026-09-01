import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

// 管理画面用：指定日にオンライン予約に開放されているテーブル一覧を取得
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

// 管理画面用：指定日・指定テーブルのオンライン予約公開/非公開を切り替え
export async function PUT(req: NextRequest) {
  try {
    const { date, tableLabel, isOpen } = await req.json();

    if (!date || !tableLabel || typeof isOpen !== 'boolean') {
      return NextResponse.json({ error: '必須項目が入力されていません。' }, { status: 400 });
    }

    if (isOpen) {
      const { error } = await supabase
        .from('online_table_overrides')
        .upsert({ date, table_label: tableLabel, is_open: true }, { onConflict: 'date,table_label' });
      if (error) throw error;
    } else {
      // オフラインが既定値なので、行自体を削除する
      const { error } = await supabase
        .from('online_table_overrides')
        .delete()
        .eq('date', date)
        .eq('table_label', tableLabel);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '更新に失敗しました。' }, { status: 500 });
  }
}
