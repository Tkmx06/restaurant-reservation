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

// フランクフルト・メッセの見本市・展示会（コンサート等は対象外）。
// 規模の大小を問わず、開催が確認できたものを掲載。小規模な見本市でも近隣ホテル・
// 飲食店の来客に影響することがあるため、大型見本市に限らず幅広く登録する。
export const FRANKFURT_MESSE_EVENTS: MesseEvent[] = [
  // 2026年1〜3月（参考：来年以降の同時期の傾向把握用）
  { startDate: '2026-01-13', endDate: '2026-01-16', name: 'ハイムテキスタイル（Heimtextil）' },
  { startDate: '2026-02-06', endDate: '2026-02-10', name: 'アンビエンテ（Ambiente）ほか消費財見本市クラスター' },
  { startDate: '2026-03-08', endDate: '2026-03-13', name: 'ライト・アンド・ビルディング（Light + Building）' },
  // 2026年9〜12月（予約受付期間内）
  { startDate: '2026-09-08', endDate: '2026-09-12', name: 'オートメカニカ（Automechanika）' },
  { startDate: '2026-09-23', endDate: '2026-09-24', name: 'Compounding & Recycling Expo' },
  { startDate: '2026-09-25', endDate: '2026-09-26', name: 'World of Trading' },
  { startDate: '2026-10-07', endDate: '2026-10-11', name: 'フランクフルト・ブックフェア（Frankfurter Buchmesse）' },
  { startDate: '2026-10-16', endDate: '2026-10-18', name: 'SimRacing Expo' },
  { startDate: '2026-10-23', endDate: '2026-10-25', name: 'Marathonmall' },
  { startDate: '2026-10-30', endDate: '2026-11-01', name: 'Discovery Art Fair Frankfurt' },
  { startDate: '2026-10-31', endDate: '2026-10-31', name: 'Stuzubi 進学・就職フェア Frankfurt' },
  { startDate: '2026-11-06', endDate: '2026-11-07', name: 'infotage FACHDENTAL Frankfurt（歯科技工）' },
  { startDate: '2026-11-17', endDate: '2026-11-19', name: 'Food Ingredients Europe Frankfurt' },
  { startDate: '2026-11-17', endDate: '2026-11-20', name: 'formnext（次世代製造技術）' },
  { startDate: '2026-11-27', endDate: '2026-11-27', name: 'ITCS Frankfurt（テック・就職イベント）' },
  { startDate: '2026-12-02', endDate: '2026-12-03', name: 'ARCHITECT@WORK FRANKFURT' },
  // 2027年（参考）
  { startDate: '2027-01-29', endDate: '2027-02-01', name: 'クリエイティブワールド（Creativeworld）' },
  { startDate: '2027-02-16', endDate: '2027-02-16', name: 'GWW-NEWSWEEK Frankfurt（販促グッズ）' },
  { startDate: '2027-02-17', endDate: '2027-02-18', name: 'Pest-Protect（害虫駆除）' },
  { startDate: '2027-02-17', endDate: '2027-02-18', name: 'fiberdays（光ファイバー）' },
  { startDate: '2027-03-15', endDate: '2027-03-19', name: 'ISH（水・熱・空調の見本市）' },
  { startDate: '2027-05-11', endDate: '2027-05-13', name: 'IMEX（MICE見本市）' },
  { startDate: '2027-05-21', endDate: '2027-05-22', name: 'Einstieg Frankfurt（進学・就職フェア）' },
  { startDate: '2027-06-05', endDate: '2027-06-06', name: 'CARDMADNESS Frankfurt am Main' },
  { startDate: '2027-06-14', endDate: '2027-06-18', name: 'ACHEMA（プロセス産業の世界見本市）' },
];

export type CalendarDayInfo = { type: 'holiday' | 'messe'; label: string };

export function getCalendarInfoForDate(dateStr: string): CalendarDayInfo | null {
  const holiday = HESSEN_HOLIDAYS.find((h) => h.date === dateStr);
  if (holiday) return { type: 'holiday', label: `祝日: ${holiday.name}` };

  const messe = FRANKFURT_MESSE_EVENTS.find((m) => dateStr >= m.startDate && dateStr <= m.endDate);
  if (messe) return { type: 'messe', label: `見本市: ${messe.name}` };

  return null;
}
