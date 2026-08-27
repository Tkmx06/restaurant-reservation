import { NextRequest, NextResponse } from 'next/server';

// 簡易的な総当たり対策（サーバーインスタンスが起き続けている間だけ有効）
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15分

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const entry = attempts.get(ip);

    if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: '試行回数が多すぎます。しばらくしてからお試しください。' }, { status: 429 });
    }

    const { password } = await req.json();

    if (!password || password !== process.env.ADMIN_PASS) {
      const next = entry && entry.resetAt > now
        ? { count: entry.count + 1, resetAt: entry.resetAt }
        : { count: 1, resetAt: now + WINDOW_MS };
      attempts.set(ip, next);
      return NextResponse.json({ error: 'パスワードが違います。' }, { status: 401 });
    }

    attempts.delete(ip);

    const res = NextResponse.json({ success: true });
    res.cookies.set('admin_auth', process.env.ADMIN_SESSION_SECRET!, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // 180日
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'ログインに失敗しました。' }, { status: 500 });
  }
}
