import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('business_hours')
      .select('day_of_week, is_closed')
      .eq('is_closed', true);

    if (error) throw error;

    const closedDays = Array.from(new Set((data || []).map((d) => d.day_of_week)));

    return NextResponse.json({ closedDays });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '営業時間データの取得に失敗しました。' }, { status: 500 });
  }
}