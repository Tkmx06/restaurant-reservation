import { NextRequest, NextResponse } from 'next/server';
import { sendQaAlertEmail, sendQaOkEmail } from '@/lib/mail';

// ─── 日次の自動QAチェック ───
// 実際の予約は一切作らず、「弾かれるべきものが正しく弾かれるか」だけを毎日確認する。
// Vercelのcronから Authorization: Bearer <CRON_SECRET> 付きで叩かれる想定。
// 何かおかしい時だけ ALERT_EMAIL 宛にメールを送る（正常時は何もしない）。

const ALERT_EMAIL = 'taka01234567890@gmail.com';

type Check = { name: string; run: () => Promise<{ ok: boolean; detail: string }> };

const iso = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

async function postReservation(base: string, body: Record<string, unknown>) {
  const res = await fetch(`${base}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
  }

  const base = process.env.QA_CHECK_BASE_URL || 'https://reservation.t-style-de.com';
  const now = new Date();

  // 定休日を動的に取得し、確実に休業日となる日付を探す（曜日設定が変わっても追従する）
  let closedDateStr = iso(addDays(now, 30));
  try {
    const bh = await fetch(`${base}/api/business-hours`).then((r) => r.json());
    const closedDays: number[] = bh.closedDays || [];
    const overrideDates = new Set((bh.overrides || []).map((o: any) => o.date));
    let probe = addDays(now, 1);
    for (let i = 0; i < 60; i++) {
      const probeStr = iso(probe);
      if (closedDays.includes(probe.getDay()) && !overrideDates.has(probeStr)) {
        closedDateStr = probeStr;
        break;
      }
      probe = addDays(probe, 1);
    }
  } catch {
    // 取得失敗時は仮の日付のまま進める（このチェック自体が失敗として記録される）
  }

  const pastDateStr = iso(addDays(now, -1));
  const farFutureDateStr = iso(addDays(now, 200)); // 3ヶ月を確実に超える
  const probeDateStr = iso(addDays(now, 45)); // 弾かれ系チェック共通の遠い未来日

  const baseValidBody = {
    time: '18:00',
    adults: 2,
    children: 0,
    childAges: [],
    name: '【自動QAチェック】',
    email: 'qa-check@t-style-de.com',
    phone: '+49 000 0000000',
    totalGuests: 2,
    table_id: 7, // テーブル66（常連様専用ではない通常卓）
    notes: '',
    locale: 'ja',
  };

  const checks: Check[] = [
    {
      name: '定休日の予約は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation(base, { ...baseValidBody, date: closedDateStr });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '過去日の予約は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation(base, { ...baseValidBody, date: pastDateStr });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '3ヶ月超え未来日の予約は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation(base, { ...baseValidBody, date: farFutureDateStr });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '必須項目欠落（メール無し）は拒否されるか',
      run: async () => {
        const { email, ...rest } = baseValidBody;
        const { status, json } = await postReservation(base, { ...rest, date: probeDateStr });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '人数0名は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation(base, { ...baseValidBody, date: probeDateStr, adults: 0, totalGuests: 0 });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '人数マイナスは拒否されるか',
      run: async () => {
        const { status, json } = await postReservation(base, { ...baseValidBody, date: probeDateStr, adults: -5, totalGuests: -5 });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '人数500名（定員超過）は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation(base, { ...baseValidBody, date: probeDateStr, adults: 500, totalGuests: 500 });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '存在しないテーブルIDは拒否されるか',
      run: async () => {
        const { status, json } = await postReservation(base, { ...baseValidBody, date: probeDateStr, table_id: 99999 });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: 'オフラインの常連様専用テーブルは拒否されるか',
      run: async () => {
        // table_id 9 = テーブル「1」（常連様専用）。この日付でオンライン公開されていない前提。
        const { status, json } = await postReservation(base, { ...baseValidBody, date: probeDateStr, table_id: 9 });
        return { ok: status === 409 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '存在しないキャンセルトークンは404になるか',
      run: async () => {
        const res = await fetch(`${base}/api/reservations/cancel/00000000-0000-0000-0000-000000000000`, { method: 'PATCH' });
        return { ok: res.status === 404, detail: `status=${res.status}` };
      },
    },
    {
      name: '管理APIは無認証だと弾かれるか',
      run: async () => {
        const res = await fetch(`${base}/api/admin/reservations`);
        return { ok: res.status === 401, detail: `status=${res.status}` };
      },
    },
  ];

  const results = await Promise.all(
    checks.map(async (c) => {
      try {
        const r = await c.run();
        return { name: c.name, ...r };
      } catch (err: any) {
        return { name: c.name, ok: false, detail: `例外: ${err?.message || String(err)}` };
      }
    })
  );

  const failures = results.filter((r) => !r.ok).map((r) => ({ name: r.name, detail: r.detail }));

  if (failures.length > 0) {
    try {
      await sendQaAlertEmail({
        toEmail: ALERT_EMAIL,
        failures,
        checkedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Europe/Berlin' }),
      });
    } catch (mailError) {
      console.error('QAアラートメール送信に失敗しました:', mailError);
    }
  } else {
    try {
      await sendQaOkEmail({
        toEmail: ALERT_EMAIL,
        checkedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Europe/Berlin' }),
      });
    } catch (mailError) {
      console.error('QA完了メール送信に失敗しました:', mailError);
    }
  }

  return NextResponse.json({ ok: failures.length === 0, checked: results.length, failures });
}
