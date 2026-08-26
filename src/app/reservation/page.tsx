'use client';

import { useState, useEffect } from 'react';
import { translations, Lang } from './translations';

const TIME_SLOTS = ['18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00'];

// ─── 画面のテーブル名からデータベースの数値IDへの変換表 ───
const LABEL_TO_DB_ID: Record<string, number> = {
  '51': 1, '52': 2, '53': 3, '54': 4, '68': 5, '67': 6, '66': 7, '65': 8,
  '1': 9, '2': 10, '3': 11, '4': 12, '23': 13, '70': 14, '22': 15, '21': 16,
  '11': 17, '15': 18, '14': 19, '13': 20, '12': 21,
};

// ─── データベースの数値IDから画面のテーブル名への逆変換表 ───
const DB_ID_TO_LABEL: Record<number, string> = {
  1: '51', 2: '52', 3: '53', 4: '54', 5: '68', 6: '67', 7: '66', 8: '65',
  9: '1', 10: '2', 11: '3', 12: '4', 13: '23', 14: '70', 15: '22', 16: '21',
  17: '11', 18: '15', 19: '14', 20: '13', 21: '12',
};

// ==========================================
// 🍽️ ご指定のネット予約専用お席優先順位
// ==========================================
const GROUPS_BY_GUESTS: Record<number, any[]> = {
  // 1名：優先順位 12、13、14、15、70、66、67、22、23 (※実在しない16は除外)
  1: [
    { label: '12', mainTable: '12', combinedTables: [] },
    { label: '13', mainTable: '13', combinedTables: [] },
    { label: '14', mainTable: '14', combinedTables: [] },
    { label: '15', mainTable: '15', combinedTables: [] },
    { label: '70', mainTable: '70', combinedTables: [] },
    { label: '66', mainTable: '66', combinedTables: [] },
    { label: '67', mainTable: '67', combinedTables: [] },
    { label: '22', mainTable: '22', combinedTables: [] },
    { label: '23', mainTable: '23', combinedTables: [] },
  ],
  // 2名：優先順位 12、13、14、15、70、66、67、22、23
  2: [
    { label: '12', mainTable: '12', combinedTables: [] },
    { label: '13', mainTable: '13', combinedTables: [] },
    { label: '14', mainTable: '14', combinedTables: [] },
    { label: '15', mainTable: '15', combinedTables: [] },
    { label: '70', mainTable: '70', combinedTables: [] },
    { label: '66', mainTable: '66', combinedTables: [] },
    { label: '67', mainTable: '67', combinedTables: [] },
    { label: '22', mainTable: '22', combinedTables: [] },
    { label: '23', mainTable: '23', combinedTables: [] },
  ],
  // 3名：優先順位 11、12+13、14+15、21、22+23、65、68、66+67
  3: [
    { label: '11', mainTable: '11', combinedTables: [] },
    { label: '12 + 13', mainTable: '12', combinedTables: ['13'] },
    { label: '14 + 15', mainTable: '14', combinedTables: ['15'] },
    { label: '21', mainTable: '21', combinedTables: [] },
    { label: '22 + 23', mainTable: '22', combinedTables: ['23'] },
    { label: '65', mainTable: '65', combinedTables: [] },
    { label: '68', mainTable: '68', combinedTables: [] },
    { label: '66 + 67', mainTable: '66', combinedTables: ['67'] },
  ],
  // 4名：優先順位 11、12+13、14+15、21、22+23、65、68、66+67
  4: [
    { label: '11', mainTable: '11', combinedTables: [] },
    { label: '12 + 13', mainTable: '12', combinedTables: ['13'] },
    { label: '14 + 15', mainTable: '14', combinedTables: ['15'] },
    { label: '21', mainTable: '21', combinedTables: [] },
    { label: '22 + 23', mainTable: '22', combinedTables: ['23'] },
    { label: '65', mainTable: '65', combinedTables: [] },
    { label: '68', mainTable: '68', combinedTables: [] },
    { label: '66 + 67', mainTable: '66', combinedTables: ['67'] },
  ],
  // 5名：優先順位 12+13+14、13+14+15、21+22、65+66
  5: [
    { label: '12 + 13 + 14', mainTable: '12', combinedTables: ['13', '14'] },
    { label: '13 + 14 + 15', mainTable: '13', combinedTables: ['14', '15'] },
    { label: '21 + 22', mainTable: '21', combinedTables: ['22'] },
    { label: '65 + 66', mainTable: '65', combinedTables: ['66'] },
  ],
  // 6名：優先順位 12+13+14、13+14+15、21+22、65+66
  6: [
    { label: '12 + 13 + 14', mainTable: '12', combinedTables: ['13', '14'] },
    { label: '13 + 14 + 15', mainTable: '13', combinedTables: ['14', '15'] },
    { label: '21 + 22', mainTable: '21', combinedTables: ['22'] },
    { label: '65 + 66', mainTable: '65', combinedTables: ['66'] },
  ],
  // 7名：優先順位 12+13+14+15、21+22+23、65+66+67
  7: [
    { label: '12 + 13 + 14 + 15', mainTable: '12', combinedTables: ['13', '14', '15'] },
    { label: '21 + 22 + 23', mainTable: '21', combinedTables: ['22', '23'] },
    { label: '65 + 66 + 67', mainTable: '65', combinedTables: ['66', '67'] },
  ],
  // 8名：優先順位 12+13+14+15、21+22+23、65+66+67
  8: [
    { label: '12 + 13 + 14 + 15', mainTable: '12', combinedTables: ['13', '14', '15'] },
    { label: '21 + 22 + 23', mainTable: '21', combinedTables: ['22', '23'] },
    { label: '65 + 66 + 67', mainTable: '65', combinedTables: ['66', '67'] },
  ],
};

// 時間文字列を分単位に変換するヘルパー
const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// 指定日時かつ前後2時間（重複）で使用されているテーブルを取得
const getOccupiedTableIds = (reservations: any[], dateStr: string, timeStr: string) => {
  const targetMin = timeToMinutes(timeStr);
  const SESSION_DURATION = 120; // 120分(2時間)の滞在として重複を判定
  const ids: string[] = [];

  reservations
    .filter(r => {
      if (r.date !== dateStr || r.status !== 'confirmed') return false;
      const rMin = timeToMinutes(r.time);
      return Math.abs(rMin - targetMin) < SESSION_DURATION;
    })
    .forEach(r => {
      // データベースから取得した数値IDを、フロント用のテーブル番号文字列に変換
      const dbId = Number(r.table_id);
      const mappedLabel = DB_ID_TO_LABEL[dbId] || String(r.table_id);
      ids.push(mappedLabel.trim());

      const matches = r.notes?.match(/_combined:\[(.*?)\]/g);
      if (matches) {
        matches.forEach((m: string) => {
          const id = m.replace('_combined:[', '').replace(']', '').trim();
          if (id) ids.push(id);
        });
      }
    });
  return ids;
};

// YYYY-MM-DD 形式の文字列に変換
const formatDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 曜日名ラベルの取得
const getDayLabel = (date: Date, index: number) => {
  if (index === 0) return 'Today';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// 今日から21日分の日付リストを生成
const getDaysRange = () => {
  const range = [];
  const today = new Date();
  for (let i = 0; i < 21; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    range.push(d);
  }
  return range;
};

// iOSタッチ対応の共通スタイル
const touchFix: React.CSSProperties = {
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  cursor: 'pointer',
};

export default function ReservationPage() {
  const [lang, setLang] = useState<Lang>('de');
  const t = translations[lang];

  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [showCallPopup, setShowCallPopup] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [closedDays, setClosedDays] = useState<number[]>([]);
  const [overridesMap, setOverridesMap] = useState<Record<string, boolean>>({});
  
  // 空き席計算用に、既存の全予約情報を管理する
  const [allReservations, setAllReservations] = useState<any[]>([]);

  // ポップアップカレンダーの制御用
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  // 1. 定休日の取得
  useEffect(() => {
    fetch('/api/business-hours')
      .then((res) => res.json())
      .then((data) => {
        if (data.closedDays) setClosedDays(data.closedDays);
        if (data.overrides) {
          const map: Record<string, boolean> = {};
          data.overrides.forEach((o: { date: string; is_closed: boolean }) => {
            map[o.date] = o.is_closed;
          });
          setOverridesMap(map);
        }
      })
      .catch((err) => console.error('定休日の取得に失敗:', err));
  }, []);

  // 特定日の営業/休業を判定（特別営業日の設定が曜日パターンより優先）
  const isDateClosed = (dateStr: string, dayOfWeek: number) => {
    if (Object.prototype.hasOwnProperty.call(overridesMap, dateStr)) {
      return overridesMap[dateStr];
    }
    return closedDays.includes(dayOfWeek);
  };

  // 2. 既存の全予約リストを定期的にロード (空きテーブル算出に必須)
  useEffect(() => {
    fetch('/api/admin/reservations')
      .then((res) => res.json())
      .then((data) => {
        if (data.reservations) {
          setAllReservations(data.reservations);
        }
      })
      .catch((err) => console.error('予約データの読み込みに失敗しました:', err));
  }, [date]);

  // 3. 定休日データロード後、今日が定休日の場合は自動で翌営業日を初期選択にする
  useEffect(() => {
    if (closedDays.length > 0 && !date) {
      let d = new Date();
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date();
        checkDate.setDate(d.getDate() + i);
        if (!isDateClosed(formatDateStr(checkDate), checkDate.getDay())) {
          setDate(formatDateStr(checkDate));
          break;
        }
      }
    }
  }, [closedDays, overridesMap, date]);

  const totalGuests = adults + children;
  const dateList = getDaysRange();

  const handleAdultsChange = (val: number) => {
    const newAdults = Math.max(1, val);
    if (newAdults + children > 8) { setShowCallPopup(true); return; }
    setAdults(newAdults);
  };

  const handleChildrenChange = (val: number) => {
    const newChildren = Math.max(0, val);
    if (adults + newChildren > 8) { setShowCallPopup(true); return; }
    setChildren(newChildren);
    setChildAges(Array(newChildren).fill(0));
  };

  const updateChildAge = (index: number, age: number) => {
    const updated = [...childAges];
    updated[index] = age;
    setChildAges(updated);
  };

  // カレンダーポップアップ用のマス目生成 (過去日の判定を追加)
  const generateCalendarDays = (currentMonthDate: Date) => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysArray = Array(firstDayIndex).fill(null);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    maxDate.setMonth(maxDate.getMonth() + 4);

    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month, day);
      dateObj.setHours(0, 0, 0, 0);

      daysArray.push({
        day,
        dateStr: formatDateStr(dateObj),
        isClosed: isDateClosed(formatDateStr(dateObj), dateObj.getDay()),
        isPast: dateObj < today, // 今日より過去の日付かを判定
        isBeyondMax: dateObj > maxDate, // 本日から4ヶ月先を超える日付かを判定
      });
    }
    return daysArray;
  };

  // 予約の送信ハンドラ
  const handleSubmit = async () => {
    if (!name || !email || !phone) return;
    setSubmitting(true);
    setErrorMsg('');

    // --- テーブルの自動割り当て処理 ---
    const occupiedTableIds = getOccupiedTableIds(allReservations, date, time);
    let selectedGroup = null;
    const recommendedGroups = GROUPS_BY_GUESTS[totalGuests] || [];

    // 人数に合う推奨テーブルグループの空きを、優先順位が高い順に1つずつ探索
    for (const group of recommendedGroups) {
      const allGroupIds = [group.mainTable, ...group.combinedTables];
      const isAvailable = allGroupIds.every(id => !occupiedTableIds.includes(id));
      if (isAvailable) {
        selectedGroup = group;
        break;
      }
    }

    // 優先順位リストの中にお席の空きがない場合
    if (!selectedGroup) {
      setErrorMsg(lang === 'ja' ? 'ご指定の日時は指定の人数でご案内できるお席がございません。他の日時をご選択ください。' : 'No available table for this party size at this time.');
      setSubmitting(false);
      return;
    }

    // 複数テーブル of 結合情報 (_combined:[ID]) をメモに付与
    const combinedTags = selectedGroup.combinedTables
      .map((id: string) => `_combined:[${id}]`)
      .join(' ');
    
    const finalNotes = notes.trim()
      ? `${notes.trim()} ${combinedTags}`.trim()
      : combinedTags;

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date, 
          time, 
          adults, 
          children, 
          childAges, 
          name, 
          email, 
          phone, 
          notes: finalNotes,          // 結合情報付きのnotes
          totalGuests, 
          // ─── 修正：文字列テーブル名からデータベース用の数値IDに変換して送信 ───
          table_id: LABEL_TO_DB_ID[selectedGroup.mainTable] || 1 
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || t.defaultErrorMsg); setSubmitting(false); return; }
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(t.networkErrorMsg);
    }
    setSubmitting(false);
  };

  const LangSwitcher = () => (
    <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 6, zIndex: 30 }}>
      {(['de', 'en', 'ja'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            ...touchFix,
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${lang === l ? '#E21A22' : '#E5E7EB'}`,
            background: lang === l ? '#E21A22' : 'transparent',
            color: lang === l ? '#FFFFFF' : '#6B7280',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {l === 'ja' ? 'JP' : l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', color: '#1F2937', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 16px', fontFamily: 'sans-serif', position: 'relative' }}>
        <LangSwitcher />
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 40, textAlign: 'center', maxWidth: 420, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: '#10B981' }}>✓</div>
          <div style={{ color: '#10B981', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t.completedTitle}</div>
          <div style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.7 }}>
            <strong style={{ color: '#1F2937' }}>{name}</strong> {t.sama}<br />
            {date} {time} — {totalGuests}{t.person}<br /><br />
            <span style={{ color: '#888888' }}>{email} {t.completedMsg}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', color: '#1F2937', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: 'sans-serif', position: 'relative' }}>
      <LangSwitcher />
      <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 32, maxWidth: 480, width: '100%', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        
        {/* 📷 ヘッダーロゴ画像の配置 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <img 
            src="/logo.png" 
            alt="t.style bistro logo" 
            style={{ 
              maxWidth: '180px', 
              width: '100%', 
              height: 'auto',
              display: 'block'
            }} 
          />
        </div>

        {/* 選択した月のラベル表示 (Table for 2 on は削除) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #F3F4F6', paddingBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.010em' }}>
            {lang === 'ja' ? 'ご希望日の選択' : 'Select Date & Time'}
          </span>
          {date && (
            <span style={{ fontSize: 14, fontWeight: 700, color: '#E21A22', fontFamily: 'sans-serif' }}>
              {new Date(date + 'T00:00:00').toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>

        {step === 1 && (
          <>
            {/* 📅 横スクロール式 日付選択 */}
            <div style={{ marginBottom: 24, position: 'relative' }}>
              <label style={{ fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 8 }}>{t.date}</label>
              
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                {/* スクロールトラック */}
                <div 
                  className="scrollbar-none"
                  style={{
                    flex: 1,
                    display: 'flex',
                    gap: 12,
                    overflowX: 'auto',
                    paddingRight: 56, // カレンダーアイコンと重ならないための余白
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <style>{`
                    .scrollbar-none::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>

                  {dateList.map((dateObj, idx) => {
                    const dateStr = formatDateStr(dateObj);
                    const isSelected = date === dateStr;
                    const isClosed = isDateClosed(dateStr, dateObj.getDay());
                    const dayLabel = getDayLabel(dateObj, idx);
                    const dayNum = dateObj.getDate();

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isClosed}
                        onClick={() => {
                          setDate(dateStr);
                          setShowCalendarPopup(false);
                        }}
                        style={{
                          ...touchFix,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 54,
                          padding: '10px 0',
                          borderRadius: 12,
                          border: isSelected ? '1px solid #E21A22' : '1px solid transparent',
                          background: isSelected ? '#E21A22' : isClosed ? 'transparent' : '#F3F4F6',
                          color: isSelected ? '#FFFFFF' : isClosed ? '#7F8C8D' : '#374151', // 定休日は濃いめのグレー文字
                          opacity: isClosed ? 0.55 : 1, // 視認性を上げるために透明度を0.55へアップ
                          pointerEvents: isClosed ? 'none' : 'auto',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: isSelected ? '#FFFFFF' : isClosed ? '#7F8C8D' : '#9CA3AF' }}>
                          {dayLabel}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>
                          {dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 固定カレンダーボタン */}
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                  background: 'linear-gradient(to left, #FFFFFF 80%, transparent)',
                  zIndex: 10,
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (date) {
                        setCurrentCalendarMonth(new Date(date + 'T00:00:00'));
                      }
                      setShowCalendarPopup(!showCalendarPopup);
                    }}
                    style={{
                      ...touchFix,
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: '#F3F4F6',
                      border: '1px solid #E5E7EB',
                      color: '#E21A22',
                      fontSize: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    }}
                  >
                    📅
                  </button>
                </div>
              </div>

              {/* カレンダーポップアップ */}
              {showCalendarPopup && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 64,
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  padding: 16,
                  zIndex: 100,
                  width: 280,
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                }}>
                  {/* 年月の操作 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <button 
                      type="button" 
                      style={{ ...touchFix, background: 'none', border: 'none', color: '#888', fontWeight: 'bold' }}
                      onClick={() => {
                        const d = new Date(currentCalendarMonth);
                        d.setMonth(d.getMonth() - 1);
                        setCurrentCalendarMonth(d);
                      }}
                    >
                      &lt;
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1F2937', fontFamily: 'monospace' }}>
                      {currentCalendarMonth.getFullYear()} / {String(currentCalendarMonth.getMonth() + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      disabled={(() => {
                        const maxMonth = new Date();
                        maxMonth.setMonth(maxMonth.getMonth() + 4);
                        return currentCalendarMonth.getFullYear() >= maxMonth.getFullYear() && currentCalendarMonth.getMonth() >= maxMonth.getMonth();
                      })()}
                      style={{ ...touchFix, background: 'none', border: 'none', color: '#888', fontWeight: 'bold' }}
                      onClick={() => {
                        const d = new Date(currentCalendarMonth);
                        d.setMonth(d.getMonth() + 1);
                        setCurrentCalendarMonth(d);
                      }}
                    >
                      &gt;
                    </button>
                  </div>
                  {/* 曜日ヘッダー */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#9CA3AF', marginBottom: 8 }}>
                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                  </div>
                  {/* 日数マス目 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {generateCalendarDays(currentCalendarMonth).map((dayObj, index) => {
                      if (!dayObj) return <div key={`empty-${index}`} />;
                      
                      // 定休日・過去日・受付期間(4ヶ月先まで)超過の表示制限
                      if (dayObj.isClosed || dayObj.isPast || dayObj.isBeyondMax) {
                        return (
                          <div 
                            key={dayObj.dateStr} 
                            style={{
                              height: 32,
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: dayObj.isClosed ? '#FEF2F2' : '#F9FAFB',
                              color: dayObj.isClosed ? '#EF4444' : '#9CA3AF',
                              fontSize: 11,
                              fontWeight: 500,
                              textDecoration: dayObj.isClosed ? 'line-through' : 'none',
                              opacity: 0.35,
                              cursor: 'not-allowed',
                            }}
                          >
                            {dayObj.day}
                          </div>
                        );
                      }

                      const isCurrentSelected = dayObj.dateStr === date;

                      return (
                        <button 
                          type="button" 
                          key={dayObj.dateStr} 
                          onClick={() => { 
                            setDate(dayObj.dateStr); 
                            setShowCalendarPopup(false);
                          }} 
                          style={{
                            ...touchFix,
                            height: 32,
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            border: 'none',
                            background: isCurrentSelected ? '#E21A22' : '#F3F4F6',
                            color: isCurrentSelected ? '#FFFFFF' : '#374151',
                            transition: 'all 0.1s ease',
                          }}
                        >
                          {dayObj.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 時間 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 6 }}>{t.time}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TIME_SLOTS.map((tm) => (
                  <button
                    key={tm}
                    onClick={() => setTime(tm)}
                    style={{
                      ...touchFix,
                      padding: '8px 14px',
                      borderRadius: 6,
                      border: `1px solid ${time === tm ? '#E21A22' : '#E5E7EB'}`,
                      background: time === tm ? '#E21A22' : '#F3F4F6',
                      color: time === tm ? '#FFFFFF' : '#374151',
                      fontSize: 13,
                      fontWeight: time === tm ? 700 : 400,
                    }}
                  >
                    {tm}
                  </button>
                ))}
              </div>
            </div>

            {/* 大人 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 6 }}>{t.adults}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => handleAdultsChange(adults - 1)}
                  style={{ ...touchFix, width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: '#F3F4F6', color: '#1F2937', fontSize: 18 }}
                >−</button>
                <span style={{ fontSize: 18, fontWeight: 600, minWidth: 24, textAlign: 'center', color: '#1F2937' }}>{adults}</span>
                <button
                  onClick={() => handleAdultsChange(adults + 1)}
                  style={{ ...touchFix, width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: '#F3F4F6', color: '#1F2937', fontSize: 18 }}
                >+</button>
                <span style={{ color: '#6B7280', fontSize: 13 }}>{t.person}</span>
              </div>
            </div>

            {/* 子供 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 6 }}>{t.children}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => handleChildrenChange(children - 1)}
                  style={{ ...touchFix, width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: '#F3F4F6', color: '#1F2937', fontSize: 18 }}
                >−</button>
                <span style={{ fontSize: 18, fontWeight: 600, minWidth: 24, textAlign: 'center', color: '#1F2937' }}>{children}</span>
                <button
                  onClick={() => handleChildrenChange(children + 1)}
                  style={{ ...touchFix, width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: '#F3F4F6', color: '#1F2937', fontSize: 18 }}
                >+</button>
                <span style={{ color: '#6B7280', fontSize: 13 }}>{t.person}</span>
              </div>

              {children > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.from({ length: children }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#4B5563', minWidth: 60 }}>{t.childAge(i + 1)}</span>
                      <select
                        value={childAges[i] || 0}
                        onChange={(e) => updateChildAge(i, parseInt(e.target.value))}
                        style={{ width: 70, background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', color: '#1F2937', fontSize: 13 }}
                      >
                        {Array.from({ length: 18 }).map((_, age) => (
                          <option key={age} value={age}>{age}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{t.yearsOld}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 20 }}>{t.total}: {totalGuests}{t.person}</div>

            {/* 次へボタン */}
            <button
              disabled={!date || !time}
              onClick={() => setStep(2)}
              style={{
                ...touchFix,
                width: '100%',
                padding: 12,
                borderRadius: 8,
                background: date && time ? '#E21A22' : '#E5E7EB',
                color: date && time ? '#FFFFFF' : '#9CA3AF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: date && time ? 'pointer' : 'default',
              }}
            >
              {t.next}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151', marginBottom: 16 }}>
              📅 {date} {time} — {totalGuests}{t.person}
              <button
                onClick={() => setStep(1)}
                style={{ ...touchFix, float: 'right', background: 'none', border: 'none', color: '#E21A22', fontSize: 12, fontWeight: 'bold' }}
              >
                {t.change}
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 6 }}>{t.name} *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 14px', color: '#1F2937', fontSize: 14, boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 6 }}>{t.email} *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 14px', color: '#1F2937', fontSize: 14, boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 6 }}>{t.phone} *</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 14px', color: '#1F2937', fontSize: 14, boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 6 }}>{t.notes}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 14px', color: '#1F2937', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            {errorMsg && (
              <div style={{ background: '#FEF2F2', border: '1px solid #E21A22', borderRadius: 8, padding: 12, fontSize: 13, color: '#E21A22', marginBottom: 16 }}>
                {errorMsg}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              disabled={!name || !email || !phone || submitting}
              onClick={handleSubmit}
              style={{
                ...touchFix,
                width: '100%',
                padding: 12,
                borderRadius: 8,
                background: name && email && phone && !submitting ? '#E21A22' : '#E5E7EB',
                color: name && email && phone && !submitting ? '#FFFFFF' : '#9CA3AF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: name && email && phone && !submitting ? 'pointer' : 'default',
              }}
            >
              {submitting ? t.submitting : t.submit}
            </button>
          </>
        )}

        {/* 9名以上ポップアップ */}
        {showCallPopup && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
            <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 28, maxWidth: 320, textAlign: 'center', border: '1px solid #E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-line', color: '#374151' }}>
                {t.callPopup}
              </p>
              <button
                onClick={() => setShowCallPopup(false)}
                style={{ ...touchFix, padding: '8px 20px', borderRadius: 8, background: '#E21A22', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700 }}
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}