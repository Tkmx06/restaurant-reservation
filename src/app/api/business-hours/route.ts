import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('business_hours')
      .select('day_of_week, is_closed')
      .eq('is_closed', true);

    if (error) throw error;

    const closedDays = Array.from(new Set((data || []).map((d) => d.day_of_week)));

    const { data: overrideData, error: overrideError } = await supabase
      .from('business_day_overrides')
      .select('date, is_closed')
      .gte('date', getTodayString())
      .order('date', { ascending: true });

    if (overrideError) console.error('特別営業日データの取得に失敗しました:', overrideError);

    return NextResponse.json({ closedDays, overrides: overrideData || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '営業時間データの取得に失敗しました。' }, { status: 500 });
  }
}