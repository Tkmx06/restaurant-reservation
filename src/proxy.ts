import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isProtectedApi = pathname.startsWith('/api/admin') && pathname !== '/api/admin/login';

  if (isProtectedPage || isProtectedApi) {
    const cookie = req.cookies.get('admin_auth')?.value;

    if (cookie && cookie === process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.next();
    }

    if (isProtectedApi) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const loginUrl = new URL('/admin/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
