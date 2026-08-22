import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendCustomerConfirmation, sendStaffNotification } from '@/lib/mail';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'yahoo.co.jp', 'hotmail.com', 'outlook.com', 'icloud.com', 'web.de', 'gmx.de', 't-online.de'];

function extractCompanyDomain(email: string): { domain: string | null; companyName: string | null } {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || PERSONAL_DOMAINS.includes(domain)) {
    return { domain: null, companyName: null };
  }
  const parts = domain.split('.');
  const name = parts[0];
  const companyName = name.charAt(0).toUpperCase() + name.slice(1);
  return { domain, companyName };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, time, adults, children, childAges, name, email, phone, notes, totalGuests, table_id } = body;

    // 1. 必須項目チェック
    if (!date || !time || !name || !email || !phone || !totalGuests || !table_id) {
      return NextResponse.json({ error: '必須項目が入力されていません。' }, { status: 400 });
    }

    // 2. 定休日チェック
    const dayOfWeek = new Date(date).getDay();

    const { data: businessHours, error: bhError } = await supabase
      .from('business_hours')
      .select('*')
      .eq('day_of_week', dayOfWeek);

    if (bhError) {
      console.error('営業時間データの取得に失敗しました:', bhError);
    }

    if (businessHours && businessHours.length > 0) {
      const isClosedToday = businessHours.some((bh) => bh.is_closed === true || bh.is_closed === 'true');
      if (isClosedToday) {
        return NextResponse.json({ error: '申し訳ございません、ご希望の日は定休日です。' }, { status: 400 });
      }
    }

    // 3. 顧客情報・来店回数の処理
    const { domain, companyName } = extractCompanyDomain(email);

    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('email', email);

    const visitCount = (count || 0) + 1;

    // 4. 予約の確定（挿入）
    const { data: newReservation, error: insertError } = await supabase
      .from('reservations')
      .insert({
        table_id: table_id,
        guest_name: name,
        email,
        phone,
        guests: totalGuests,
        date,
        time,
        notes: notes,
        company_domain: domain,
        company_name: companyName,
        visit_count: visitCount,
        status: 'confirmed',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 5. 予約完了メールの送信（お客様向け & スタッフ向け）
    const bookingDate = `${date} ${time}`;
    const guests = totalGuests;
    const locale = body.locale || 'de'; // デフォルトはドイツ語('de')

    try {
      await Promise.all([
        sendCustomerConfirmation({
          customerName: name,
          customerEmail: email,
          bookingDate,
          guests,
          locale,
        }),
        sendStaffNotification({
          customerName: name,
          customerEmail: email,
          bookingDate,
          guests,
        }),
      ]);
    } catch (mailError) {
      console.error('メール送信失敗:', mailError);
    }

    return NextResponse.json({ success: true, reservation: newReservation });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}