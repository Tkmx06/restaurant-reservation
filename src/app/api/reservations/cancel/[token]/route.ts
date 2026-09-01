import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { sendCancellationStaffNotification } from '@/lib/mail';

// お客様自身が予約内容を確認するための最小限の情報取得（GET）
export async function GET(req: NextRequest, ctx: RouteContext<'/api/reservations/cancel/[token]'>) {
  try {
    const { token } = await ctx.params;

    const { data, error } = await supabase
      .from('reservations')
      .select('id, guest_name, date, time, guests, status')
      .eq('cancel_token', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '予約が見つかりませんでした。' }, { status: 404 });
    }

    return NextResponse.json({ reservation: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '予約データの取得に失敗しました。' }, { status: 500 });
  }
}

// お客様自身によるキャンセル（PATCH）
export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/reservations/cancel/[token]'>) {
  try {
    const { token } = await ctx.params;

    const { data: existing, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('cancel_token', token)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: '予約が見つかりませんでした。' }, { status: 404 });
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json({ success: true, reservation: existing });
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('cancel_token', token)
      .select()
      .single();

    if (error) throw error;

    try {
      await sendCancellationStaffNotification({
        customerName: existing.guest_name,
        customerEmail: existing.email,
        bookingDate: `${existing.date} ${existing.time}`,
        guests: existing.guests,
      });
    } catch (mailError) {
      console.error('キャンセル通知メール送信失敗:', mailError);
    }

    return NextResponse.json({ success: true, reservation: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'キャンセル処理に失敗しました。' }, { status: 500 });
  }
}
