// ヘッセン州の祝日とフランクフルト・メッセ（見本市・展示会）の主要日程。
// 管理画面の日付スライダー／カレンダーでの表示と、月次レポートの需要予測コメントに使う。
// 出典: feiertage-deutschland.de / messefrankfurt.com 系の公式サイト（2026年8月時点）。
// 祝日は移動祝日（イースター起算）を含め毎年変わるため、年が変わったら追記が必要。

export type HessenHoliday = { date: string; name: string };
export type MesseEvent = { startDate: string; endDate: string; name: string };

export const HESSEN_HOLIDAYS: HessenHoliday[] = [
  // 2026年
  { date: '2026-01-01', name: '元日' },
  { date: '2026-04-03', name: '聖金曜日（グッドフライデー）' },
  { date: '2026-04-06', name: '復活祭の月曜日' },
  { date: '2026-05-01', name: 'メーデー' },
  { date: '2026-05-14', name: 'キリスト昇天祭' },
  { date: '2026-05-25', name: '聖霊降臨祭の月曜日' },
  { date: '2026-06-04', name: '聖体の祝日' },
  { date: '2026-10-03', name: 'ドイツ統一の日' },
  { date: '2026-12-25', name: 'クリスマス' },
  { date: '2026-12-26', name: 'ボクシングデー' },
  // 2027年
  { date: '2027-01-01', name: '元日' },
  { date: '2027-03-26', name: '聖金曜日（グッドフライデー）' },
  { date: '2027-03-29', name: '復活祭の月曜日' },
  { date: '2027-05-01', name: 'メーデー' },
  { date: '2027-05-06', name: 'キリスト昇天祭' },
  { date: '2027-05-17', name: '聖霊降臨祭の月曜日' },
  { date: '2027-05-27', name: '聖体の祝日' },
  { date: '2027-10-03', name: 'ドイツ統一の日' },
  { date: '2027-12-25', name: 'クリスマス' },
  { date: '2027-12-26', name: 'ボクシングデー' },
];

// フランクフルト・メッセの主要な見本市・展示会（コンサート等は対象外）。
// 来場者数の多い大型見本市を中心に掲載。開催週は近隣飲食店の来客増加が見込まれる。
export const FRANKFURT_MESSE_EVENTS: MesseEvent[] = [
  { startDate: '2026-01-13', endDate: '2026-01-16', name: 'ハイムテキスタイル（Heimtextil）' },
  { startDate: '2026-02-06', endDate: '2026-02-10', name: 'アンビエンテ（Ambiente）ほか消費財見本市クラスター' },
  { startDate: '2026-03-08', endDate: '2026-03-13', name: 'ライト・アンド・ビルディング（Light + Building）' },
  { startDate: '2026-09-08', endDate: '2026-09-12', name: 'オートメカニカ（Automechanika）' },
  { startDate: '2026-10-07', endDate: '2026-10-11', name: 'フランクフルト・ブックフェア（Frankfurter Buchmesse）' },
  { startDate: '2027-03-15', endDate: '2027-03-19', name: 'ISH（水・熱・空調の見本市）' },
];

export type CalendarDayInfo = { type: 'holiday' | 'messe'; label: string };

export function getCalendarInfoForDate(dateStr: string): CalendarDayInfo | null {
  const holiday = HESSEN_HOLIDAYS.find((h) => h.date === dateStr);
  if (holiday) return { type: 'holiday', label: `祝日: ${holiday.name}` };

  const messe = FRANKFURT_MESSE_EVENTS.find((m) => dateStr >= m.startDate && dateStr <= m.endDate);
  if (messe) return { type: 'messe', label: `見本市: ${messe.name}` };

  return null;
}
