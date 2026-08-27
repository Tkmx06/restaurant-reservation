import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 管理画面用：全テーブルの現在の公開状態を取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('online_booking_settings')
      .select('table_label, is_open');

    if (error) throw error;

    return NextResponse.json({ settings: data || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '設定の取得に失敗しました。' }, { status: 500 });
  }
}

// 管理画面用：特定テーブルのオンライン予約公開/非公開を切り替え
export async function PUT(req: NextRequest) {
  try {
    const { tableLabel, isOpen } = await req.json();

    if (!tableLabel || typeof isOpen !== 'boolean') {
      return NextResponse.json({ error: '必須項目が入力されていません。' }, { status: 400 });
    }

    const { error } = await supabase
      .from('online_booking_settings')
      .upsert({ table_label: tableLabel, is_open: isOpen }, { onConflict: 'table_label' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '更新に失敗しました。' }, { status: 500 });
  }
}
