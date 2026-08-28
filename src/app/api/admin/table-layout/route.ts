import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 管理画面のフロアマップ配置（手動編集した位置・大きさ）を取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('admin_table_layout')
      .select('table_label, top, left, width, type');

    if (error) throw error;

    return NextResponse.json({ layout: data || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '配置の取得に失敗しました。' }, { status: 500 });
  }
}

// 管理画面のフロアマップ配置をまとめて保存（複数テーブル分を一括upsert）
export async function PUT(req: NextRequest) {
  try {
    const { tables } = await req.json();

    if (!Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json({ error: '必須項目が入力されていません。' }, { status: 400 });
    }

    const rows = tables.map((t: any) => ({
      table_label: String(t.table_label),
      top: Number(t.top),
      left: Number(t.left),
      width: Number(t.width),
      type: String(t.type),
    }));

    const { error } = await supabase
      .from('admin_table_layout')
      .upsert(rows, { onConflict: 'table_label' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '配置の保存に失敗しました。' }, { status: 500 });
  }
}
