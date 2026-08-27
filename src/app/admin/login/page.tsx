'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ログインに失敗しました。');
        setLoading(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('通信エラーが発生しました。');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
        <h1 className="text-white text-sm font-black mb-4 text-center">🔒 管理画面ログイン</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          autoFocus
          className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-center font-bold tracking-widest mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        {error && <p className="text-rose-400 text-xs text-center mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{ cursor: 'pointer' }}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black py-3 rounded-xl transition text-sm"
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}
