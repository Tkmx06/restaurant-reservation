import { createClient } from '@supabase/supabase-js';

// ブラウザ（クライアントコンポーネント）専用の Supabase クライアント。
// anon キー（公開してよい鍵）のみを使用し、個人情報を含む reservations テーブルへの
// 読み取り権限は一切付与していない。用途は「admin-reservations」ブロードキャスト
// チャンネルの購読のみ（予約に変更があったことを検知するトリガーとして使う）。
// このクライアントで reservations テーブルを直接 select してはいけない
// （anon には SELECT 権限が無いため空振りするか、将来権限を誤って付与した際の
// 個人情報漏えいリスクにもなる）。予約データの取得は必ず /api/admin/* 経由で行うこと。
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL が設定されていません。');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません。');
}

export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
