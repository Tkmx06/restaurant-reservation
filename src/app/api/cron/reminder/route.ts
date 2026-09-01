import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendReminderEmail } from '@/lib/mail';

// ─── 来店リマインダーの自動送信 ───
// 毎日17:00(UTC)にVercelのcronから Authorization: Bearer <CRON_SECRET> 付きで叩かれる想定。
// ・翌日の予約 → 前日リマインダーとして全件送信
// ・当日の予約のうち、開始時刻が「今から約2時間後」のもの → 直前リマインダーとして送信

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const REMINDER_LEAD_MIN = 120; // 当日リマインダーの目安リード（分）
const REMINDER_WINDOW_MIN = 30; // 上記リードからの許容幅（分）

const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

function getBerlinNowMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');
  return hour * 60 + minute;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
  }

  const now = new Date();

  const localToday = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).replace(/\//g, '-');

  const tomorrowDateObj = new Date(`${localToday}T12:00:00`);
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const localTomorrow = `${tomorrowDateObj.getFullYear()}-${String(tomorrowDateObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDateObj.getDate()).padStart(2, '0')}`;

  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('id, guest_name, email, date, time, guests, cancel_token, status')
    .eq('status', 'confirmed')
    .in('date', [localToday, localTomorrow]);

  if (error) {
    console.error('リマインダー対象の予約取得に失敗しました:', error);
    return NextResponse.json({ error: '予約データの取得に失敗しました。' }, { status: 500 });
  }

  const nowMin = getBerlinNowMinutes(now);
  const windowStart = nowMin + REMINDER_LEAD_MIN - REMINDER_WINDOW_MIN;
  const windowEnd = nowMin + REMINDER_LEAD_MIN + REMINDER_WINDOW_MIN;

  const targets = (reservations || []).filter((r) => {
    if (r.date === localTomorrow) return true;
    if (r.date === localToday) {
      const rMin = timeToMinutes(String(r.time).slice(0, 5));
      return rMin >= windowStart && rMin <= windowEnd;
    }
    return false;
  });

  const base = req.nextUrl.origin;
  const results = await Promise.all(
    targets.map(async (r) => {
      try {
        const cancelUrl = `${base}/reservation/cancel/${r.cancel_token}?locale=de`;
        await sendReminderEmail({
          customerName: r.guest_name,
          customerEmail: r.email,
          bookingDate: `${r.date} ${String(r.time).slice(0, 5)}`,
          guests: r.guests,
          locale: 'de',
          cancelUrl,
        });
        return { id: r.id, ok: true };
      } catch (mailError: any) {
        console.error('リマインダーメール送信失敗:', mailError);
        return { id: r.id, ok: false, error: mailError?.message || String(mailError) };
      }
    })
  );

  return NextResponse.json({
    ok: true,
    checked: reservations?.length || 0,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
