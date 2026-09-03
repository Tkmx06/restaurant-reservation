import { NextRequest, NextResponse } from 'next/server';
import { sendQaAlertEmail, sendQaOkEmail } from '@/lib/mail';

// ─── 手動QAチェック実行用エンドポイント ───
// 管理者が管理画面から QAチェックを手動実行する際に使用
// Vercelのデプロイメント保護により、管理画面からのアクセスのみ許可される

export async function POST(req: NextRequest) {
  // Vercelのデプロイメント保護により、管理者のみがアクセス可能
  // クライアントからのリクエストは自動的に検証される

  const base = req.nextUrl.origin;
  const now = new Date();

  // ─── QAチェック処理本体（route.ts から流用） ───
  const iso = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  async function postReservation(body: Record<string, unknown>) {
    const res = await fetch(`${base}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  type Check = { name: string; run: () => Promise<{ ok: boolean; detail: string }> };

  // 定休日を動的に取得
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
    // 取得失敗時は仮の日付のまま進める
  }

  const pastDateStr = iso(addDays(now, -1));
  const farFutureDateStr = iso(addDays(now, 200));
  const probeDateStr = iso(addDays(now, 45));

  const baseValidBody = {
    time: '18:00',
    adults: 2,
    children: 0,
    childAges: [],
    name: '【自動QAチェック】',
    email: 'qa-check@t-style-de.com',
    phone: '+49 000 0000000',
    totalGuests: 2,
    table_id: 7,
    notes: '',
    locale: 'ja',
  };

  const checks: Check[] = [
    {
      name: '定休日の予約は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation({ ...baseValidBody, date: closedDateStr });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '過去日の予約は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation({ ...baseValidBody, date: pastDateStr });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '3ヶ月超え未来日の予約は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation({ ...baseValidBody, date: farFutureDateStr });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '必須項目欠落（メール無し）は拒否されるか',
      run: async () => {
        const { email, ...rest } = baseValidBody;
        const { status, json } = await postReservation({ ...rest, date: probeDateStr });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '人数0名は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation({ ...baseValidBody, date: probeDateStr, adults: 0, totalGuests: 0 });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '人数マイナスは拒否されるか',
      run: async () => {
        const { status, json } = await postReservation({ ...baseValidBody, date: probeDateStr, adults: -5, totalGuests: -5 });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '人数500名（定員超過）は拒否されるか',
      run: async () => {
        const { status, json } = await postReservation({ ...baseValidBody, date: probeDateStr, adults: 500, totalGuests: 500 });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: '存在しないテーブルIDは拒否されるか',
      run: async () => {
        const { status, json } = await postReservation({ ...baseValidBody, date: probeDateStr, table_id: 99999 });
        return { ok: status === 400 && !!json.error, detail: `status=${status} body=${JSON.stringify(json)}` };
      },
    },
    {
      name: 'オフラインの常連様専用テーブルは拒否されるか',
      run: async () => {
        const { status, json } = await postReservation({ ...baseValidBody, date: probeDateStr, table_id: 9 });
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

  // チェック実行
  const results = await Promise.all(checks.map(c => c.run()));
  const failures = checks
    .map((c, i) => ({ ...c, ...results[i] }))
    .filter((c) => !c.ok);

  // 結果を通知（問題があれば警告メール、なければ完了メール）
  const ALERT_EMAIL = 'taka01234567890@gmail.com';
  if (failures.length > 0) {
    await sendQaAlertEmail({
      toEmail: ALERT_EMAIL,
      failures: failures.map(f => ({ name: f.name, detail: f.detail })),
      checkedAt: new Date().toISOString(),
    });
  } else {
    await sendQaOkEmail({
      toEmail: ALERT_EMAIL,
      checkedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalChecks: checks.length,
    passedChecks: checks.length - failures.length,
    failedChecks: failures.length,
    failures: failures.map(f => f.name),
  });
}
