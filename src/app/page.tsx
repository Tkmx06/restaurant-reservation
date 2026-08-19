import { redirect } from 'next/navigation';

export default function Home() {
  // サイトにアクセスした瞬間に予約ページへ転送します
  redirect('/reservation');
}