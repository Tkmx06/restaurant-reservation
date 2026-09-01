import { createClient } from '@supabase/supabase-js';

// サーバー専用の管理者クライアント（service_role キーを使用）。
// RLS(Row Level Security)を無視して全テーブルにアクセスできるため、
// このファイルは絶対に "use client" コンポーネントや NEXT_PUBLIC_ 環境変数からは使わないこと。
// app/api/ 配下のルートハンドラ（サーバー側でのみ実行される）専用。
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY が設定されていません。Supabaseダッシュボード → Project Settings → API → service_role secret の値を .env.local と Vercel の環境変数に追加してください。'
  );
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
