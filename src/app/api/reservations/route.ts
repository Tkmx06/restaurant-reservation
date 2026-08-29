import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendCustomerConfirmation, sendStaffNotification } from '@/lib/mail';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'yahoo.co.jp', 'hotmail.com', 'outlook.com', 'icloud.com', 'web.de', 'gmx.de', 't-online.de'];

// ─── 画面のテーブル名からデータベースの数値IDへの変換表（二重予約チェック用） ───
const LABEL_TO_DB_ID: Record<string, number> = {
  '51': 1, '52': 2, '53': 3, '54': 4, '68': 5, '67': 6, '66': 7, '65': 8,
  '1': 9, '2': 10, '3': 11, '4': 12, '23': 13, '70': 14, '22': 15, '21': 16,
  '11': 17, '15': 18, '14': 19, '13': 20, '12': 21,
};
const DB_ID_TO_LABEL: Record<number, string> = Object.fromEntries(
  Object.entries(LABEL_TO_DB_ID).map(([label, id]) => [id, label])
);

// 常連様専用に確保していて、日付ごとにオンライン予約を開放した場合のみ受け付けるテーブル
const SPECIAL_TABLES = ['1', '2', '21', '22', '23', '51', '52', '53', '54', '68', '70'];

const MAX_REASONABLE_GUESTS = 40; // これを超える人数は通常あり得ないため弾く

const SESSION_DURATION_MIN = 120; // 1組あたり2時間滞在とみなして重複判定

const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// notesに埋め込まれた結合テーブルのラベル(_combined:[13]等)をDB数値IDへ変換して集める
const extractCombinedDbIds = (notes: string | null | undefined): number[] => {
  const matches = notes?.match(/_combined:\[(.*?)\]/g);
  if (!matches) return [];
  return matches
    .map((m) => LABEL_TO_DB_ID[m.replace('_combined:[', '').replace(']', '').trim()])
    .filter((id): id is number => !!id);
};

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
    const { date, time, adults, children, childAges, name, email, phone, notes, totalGuests, table_id, locale } = body;

    // 1. 必須項目チェック
    if (!date || !time || !name || !email || !phone || !totalGuests || !table_id) {
      return NextResponse.json({ error: '必須項目が入力されていません。' }, { status: 400 });
    }

    // 1b. 人数の妥当性チェック
    const guestsNum = Number(totalGuests);
    if (!Number.isInteger(guestsNum) || guestsNum <= 0 || guestsNum > MAX_REASONABLE_GUESTS) {
      return NextResponse.json({ error: 'ご人数の指定が正しくありません。' }, { status: 400 });
    }

    // 1c. テーブルIDの妥当性チェック
    const requestedLabel = DB_ID_TO_LABEL[Number(table_id)];
    if (!requestedLabel) {
      return NextResponse.json({ error: 'テーブル情報が正しくありません。' }, { status: 400 });
    }

    // 1d. 常連様専用テーブルは、その日オンライン予約に開放されている場合のみ受け付ける
    const combinedLabelsForCheck = (notes?.match(/_combined:\[(.*?)\]/g) || [])
      .map((m: string) => m.replace('_combined:[', '').replace(']', '').trim());
    const involvedSpecialLabels = [requestedLabel, ...combinedLabelsForCheck].filter((label) => SPECIAL_TABLES.includes(label));

    if (involvedSpecialLabels.length > 0) {
      const { data: openRows, error: openError } = await supabase
        .from('online_table_overrides')
        .select('table_label')
        .eq('date', date)
        .eq('is_open', true)
        .in('table_label', involvedSpecialLabels);

      if (openError) {
        console.error('オンライン公開設定の確認に失敗しました:', openError);
      }

      const openLabels = new Set((openRows || []).map((r) => r.table_label));
      const blockedLabel = involvedSpecialLabels.find((label) => !openLabels.has(label));
      if (blockedLabel) {
        return NextResponse.json(
          { error: '大変申し訳ございません、ご指定の時間帯は満席となりました。別のお時間かお日にちをお試しください。' },
          { status: 409 }
        );
      }
    }

    // 2. 定休日チェック（特定日の営業/休業設定があればそちらを優先）
    const dayOfWeek = new Date(date).getDay();

    const { data: override, error: overrideError } = await supabase
      .from('business_day_overrides')
      .select('is_closed')
      .eq('date', date)
      .maybeSingle();

    if (overrideError) {
      console.error('特別営業日データの取得に失敗しました:', overrideError);
    }

    let isClosedToday: boolean;

    if (override) {
      isClosedToday = override.is_closed;
    } else {
      const { data: businessHours, error: bhError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('day_of_week', dayOfWeek);

      if (bhError) {
        console.error('営業時間データの取得に失敗しました:', bhError);
      }

      isClosedToday = !!(businessHours && businessHours.length > 0 &&
        businessHours.some((bh) => bh.is_closed === true || bh.is_closed === 'true'));
    }

    if (isClosedToday) {
      return NextResponse.json({ error: '申し訳ございません、ご希望の日は定休日です。' }, { status: 400 });
    }

    // 3. 過去日・予約受付期間（本日から4ヶ月先まで）のチェック
    const localToday = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).replace(/\//g, '-');

    if (date < localToday) {
      return NextResponse.json({ error: 'ご指定の日付は既に過ぎています。' }, { status: 400 });
    }

    const maxDateObj = new Date(`${localToday}T00:00:00`);
    maxDateObj.setMonth(maxDateObj.getMonth() + 4);
    const maxDateStr = `${maxDateObj.getFullYear()}-${String(maxDateObj.getMonth() + 1).padStart(2, '0')}-${String(maxDateObj.getDate()).padStart(2, '0')}`;

    if (date > maxDateStr) {
      return NextResponse.json({ error: 'ご予約は本日から4ヶ月先までの日付でお願いいたします。' }, { status: 400 });
    }

    // 4. 二重予約防止チェック（同日・前後2時間以内に同じテーブル/結合テーブルの予約がないか）
    const { data: sameDayReservations, error: sameDayError } = await supabase
      .from('reservations')
      .select('table_id, time, notes')
      .eq('date', date)
      .eq('status', 'confirmed');

    if (sameDayError) {
      console.error('空席チェックに失敗しました:', sameDayError);
    }

    const targetMin = timeToMinutes(time);
    const occupiedDbIds = new Set<number>();
    (sameDayReservations || []).forEach((r) => {
      const rMin = timeToMinutes(String(r.time).slice(0, 5));
      if (Math.abs(rMin - targetMin) >= SESSION_DURATION_MIN) return;
      occupiedDbIds.add(Number(r.table_id));
      extractCombinedDbIds(r.notes).forEach((id) => occupiedDbIds.add(id));
    });

    const requestedDbIds = new Set<number>([Number(table_id), ...extractCombinedDbIds(notes)]);
    const hasConflict = [...requestedDbIds].some((id) => occupiedDbIds.has(id));

    if (hasConflict) {
      return NextResponse.json(
        { error: '大変申し訳ございません、ご指定の時間帯は満席となりました。別のお時間かお日にちをお試しください。' },
        { status: 409 }
      );
    }

    // 5. 顧客情報・来店回数の処理
    const { domain, companyName } = extractCompanyDomain(email);

    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('email', email);

    const visitCount = (count || 0) + 1;

    // 6. 予約の確定（挿入）
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
    const selectedLocale = locale || 'de'; // フォームから選ばれた言語（デフォルトはドイツ語 'de'）
    const cancelUrl = `${req.nextUrl.origin}/reservation/cancel/${newReservation.cancel_token}?locale=${selectedLocale}`;

    try {
      await Promise.all([
        sendCustomerConfirmation({
          customerName: name,
          customerEmail: email,
          bookingDate,
          guests,
          locale: selectedLocale,
          cancelUrl,
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