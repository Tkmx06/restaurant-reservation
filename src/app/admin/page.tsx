'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TableStatus {
  id: string;      
  label: string;   
  isOccupied: boolean;
  type: 'square-2' | 'rect-h-4' | 'rect-v-4' | 'counter-1';
  top: string;
  left: string;
  width: string;
}

interface CustomerSummary {
  guest_name: string;
  email: string;
  phone: string;
  company_name: string;
  notes: string;
  total_visits: number;
  last_visit: string;
  latestReservationId: number | string;
}

interface TableGroup {
  label: string;         // 表示名
  mainTable: string;     // table_id に入るメインテーブル
  combinedTables: string[]; // _combined タグに入る追加テーブル
  description: string;
}

// ─── データベースの数値IDから画面のテーブル名への逆変換表 ───
const DB_ID_TO_LABEL: Record<number, string> = {
  1: '51', 2: '52', 3: '53', 4: '54', 5: '68', 6: '67', 7: '66', 8: '65',
  9: '1', 10: '2', 11: '3', 12: '4', 13: '23', 14: '70', 15: '22', 16: '21',
  17: '11', 18: '15', 19: '14', 20: '13', 21: '12',
};

// ─── 画面のテーブル名からデータベースの数値IDへの変換表 ───
const LABEL_TO_DB_ID: Record<string, number> = {
  '51': 1, '52': 2, '53': 3, '54': 4, '68': 5, '67': 6, '66': 7, '65': 8,
  '1': 9, '2': 10, '3': 11, '4': 12, '23': 13, '70': 14, '22': 15, '21': 16,
  '11': 17, '15': 18, '14': 19, '13': 20, '12': 21,
};

// 人数ごとの推奨グループマップ (1〜8名)
const GROUPS_BY_GUESTS: Record<number, TableGroup[]> = {
  8: [
    { label: '65 + 66 + 67', mainTable: '65', combinedTables: ['66', '67'], description: '窓際・横並びテーブル' },
    { label: '21 + 22 + 23', mainTable: '21', combinedTables: ['22', '23'], description: '右奥エリア' },
    { label: '12 + 13 + 14 + 15', mainTable: '12', combinedTables: ['13', '14', '15'], description: '右カウンター沿い' },
  ],
  7: [
    { label: '65 + 66 + 67', mainTable: '65', combinedTables: ['66', '67'], description: '窓際・横並びテーブル' },
    { label: '21 + 22 + 23', mainTable: '21', combinedTables: ['22', '23'], description: '右奥エリア' },
    { label: '12 + 13 + 14 + 15', mainTable: '12', combinedTables: ['13', '14', '15'], description: '右カウンター沿い' },
  ],
  6: [
    { label: '65 + 66', mainTable: '65', combinedTables: ['66'], description: '窓際2テーブル' },
    { label: '21 + 22', mainTable: '21', combinedTables: ['22'], description: '右奥2テーブル' },
    { label: '12 + 13 + 14', mainTable: '12', combinedTables: ['13', '14'], description: '右カウンター沿い' },
  ],
  5: [
    { label: '65 + 66', mainTable: '65', combinedTables: ['66'], description: '窓際2テーブル' },
    { label: '21 + 22', mainTable: '21', combinedTables: ['22'], description: '右奥2テーブル' },
    { label: '12 + 13 + 14', mainTable: '12', combinedTables: ['13', '14'], description: '右カウンター沿い' },
  ],
  4: [
    { label: '11', mainTable: '11', combinedTables: [], description: '左下エリア' },
    { label: '68', mainTable: '68', combinedTables: [], description: '上部縦テーブル' },
    { label: '65', mainTable: '65', combinedTables: [], description: '窓際テーブル' },
    { label: '66 + 67', mainTable: '66', combinedTables: ['67'], description: '窓際小2テーブル' },
    { label: '12 + 13', mainTable: '12', combinedTables: ['13'], description: '右カウンター上2席' },
    { label: '14 + 15', mainTable: '14', combinedTables: ['15'], description: '右カウンター下2席' },
    { label: '21', mainTable: '21', combinedTables: [], description: '右奥縦テーブル' },
    { label: '22 + 23', mainTable: '22', combinedTables: ['23'], description: '右奥2テーブル' },
    { label: '1 + 2 + 3 + 4', mainTable: '1', combinedTables: ['2', '3', '4'], description: 'カウンター席4連' },
  ],
  3: [
    { label: '11', mainTable: '11', combinedTables: [], description: '左下エリア' },
    { label: '68', mainTable: '68', combinedTables: [], description: '上部縦テーブル' },
    { label: '65', mainTable: '65', combinedTables: [], description: '窓際テーブル' },
    { label: '66 + 67', mainTable: '66', combinedTables: ['67'], description: '窓際小2テーブル' },
    { label: '12 + 13', mainTable: '12', combinedTables: ['13'], description: '右カウンター上2席' },
    { label: '14 + 15', mainTable: '14', combinedTables: ['15'], description: '右カウンター下2席' },
    { label: '21', mainTable: '21', combinedTables: [], description: '右奥縦テーブル' },
    { label: '22 + 23', mainTable: '22', combinedTables: ['23'], description: '右奥2テーブル' },
    { label: '1 + 2 + 3 + 4', mainTable: '1', combinedTables: ['2', '3', '4'], description: 'カウンター席4連' },
  ],
  2: [
    { label: '12', mainTable: '12', combinedTables: [], description: '右カウンター①' },
    { label: '13', mainTable: '13', combinedTables: [], description: '右カウンター②' },
    { label: '14', mainTable: '14', combinedTables: [], description: '右カウンター③' },
    { label: '15', mainTable: '15', combinedTables: [], description: '右カウンター④' },
    { label: '70', mainTable: '70', combinedTables: [], description: '右上小テーブル' },
    { label: '22', mainTable: '22', combinedTables: [], description: '右奥①' },
    { label: '23', mainTable: '23', combinedTables: [], description: '右奥②' },
    { label: '66', mainTable: '66', combinedTables: [], description: '窓際小①' },
    { label: '67', mainTable: '67', combinedTables: [], description: '窓際小②' },
  ],
  1: [
    { label: '1', mainTable: '1', combinedTables: [], description: 'カウンター①' },
    { label: '2', mainTable: '2', combinedTables: [], description: 'カウンター②' },
    { label: '3', mainTable: '3', combinedTables: [], description: 'カウンター③' },
    { label: '4', mainTable: '4', combinedTables: [], description: 'カウンター④' },
    { label: '12', mainTable: '12', combinedTables: [], description: '右カウンター①' },
    { label: '13', mainTable: '13', combinedTables: [], description: '右カウンター②' },
    { label: '14', mainTable: '14', combinedTables: [], description: '右カウンター③' },
    { label: '15', mainTable: '15', combinedTables: [], description: '右カウンター④' },
    { label: '22', mainTable: '22', combinedTables: [], description: '右奥①' },
    { label: '23', mainTable: '23', combinedTables: [], description: '右奥②' },
    { label: '70', mainTable: '70', combinedTables: [], description: '右上小テーブル' },
    { label: '66', mainTable: '66', combinedTables: [], description: '窓際小①' },
    { label: '67', mainTable: '67', combinedTables: [], description: '窓際小②' },
  ],
};

const LARGE_PARTY_THRESHOLD = 1;

// 人数帯ごとのテーブル配色（凡例 GUEST_COUNT_LEGEND と対応）
const GUEST_COUNT_LEGEND = [
  { label: '1名', swatch: 'bg-sky-500', classes: 'from-sky-500 to-sky-600 border-sky-700 ring-sky-300/30' },
  { label: '2名', swatch: 'bg-emerald-500', classes: 'from-emerald-500 to-emerald-600 border-emerald-700 ring-emerald-300/30' },
  { label: '3-4名', swatch: 'bg-amber-500', classes: 'from-amber-500 to-amber-600 border-amber-700 ring-amber-300/30' },
  { label: '5-6名', swatch: 'bg-violet-500', classes: 'from-violet-500 to-violet-600 border-violet-700 ring-violet-300/30' },
  { label: '7-8名', swatch: 'bg-rose-500', classes: 'from-rose-500 to-rose-600 border-rose-700 ring-rose-300/30' },
  { label: '9名以上', swatch: 'bg-red-600', classes: 'from-red-600 to-red-700 border-red-800 ring-red-300/30' },
];

const getGuestCountColorClasses = (guests: number | undefined) => {
  const n = Number(guests) || 0;
  if (n <= 1) return GUEST_COUNT_LEGEND[0].classes;
  if (n === 2) return GUEST_COUNT_LEGEND[1].classes;
  if (n <= 4) return GUEST_COUNT_LEGEND[2].classes;
  if (n <= 6) return GUEST_COUNT_LEGEND[3].classes;
  if (n <= 8) return GUEST_COUNT_LEGEND[4].classes;
  return GUEST_COUNT_LEGEND[5].classes;
};

// 常連様専用に確保し、通常オンライン予約の対象外にしているテーブル（日付ごとに公開設定可能）
const SPECIAL_TABLES = ['1', '2', '3', '4', '21', '22', '23', '51', '52', '53', '54', '68', '70'];

// テーブル形状ごとの座席数（結合テーブルの場合、その卓が担う人数の表示に使う）
const getTableCapacity = (type: TableStatus['type']) => {
  if (type === 'counter-1') return 1;
  if (type === 'square-2') return 2;
  return 4; // rect-h-4, rect-v-4
};

// ⚠️ 修正: 削除されてしまっていた getTodayString を復元
const getTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ミニマップ用スケール定義
const S = 1.98;
const OL = 48;
const miniMapTables = [
  { id: '51', type: 'rect-h-4', top: 4,    left: (48   - OL)*S+1, w: 9.5 *S, h: 5.5 },
  { id: '52', type: 'rect-h-4', top: 4,    left: (58.5 - OL)*S+1, w: 9.5 *S, h: 5.5 },
  { id: '53', type: 'rect-h-4', top: 14,   left: (48   - OL)*S+1, w: 9.5 *S, h: 5.5 },
  { id: '54', type: 'rect-h-4', top: 14,   left: (58.5 - OL)*S+1, w: 9.5 *S, h: 5.5 },
  { id: '68', type: 'rect-v-4', top: 4,    left: (71   - OL)*S+1, w: 5.5 *S, h: 11  },
  { id: '67', type: 'square-2', top: 4,    left: (78   - OL)*S+1, w: 5   *S, h: 5.5 },
  { id: '66', type: 'square-2', top: 4,    left: (84   - OL)*S+1, w: 5   *S, h: 5.5 },
  { id: '65', type: 'rect-h-4', top: 4,    left: (89.5 - OL)*S+1, w: 9   *S, h: 5.5 },
  { id: '1',  type: 'counter',  top: 24,   left: (78.5 - OL)*S+1, w: 3.5 *S, h: 3.5 },
  { id: '2',  type: 'counter',  top: 29.5, left: (78.5 - OL)*S+1, w: 3.5 *S, h: 3.5 },
  { id: '3',  type: 'counter',  top: 35,   left: (78.5 - OL)*S+1, w: 3.5 *S, h: 3.5 },
  { id: '4',  type: 'counter',  top: 40.5, left: (78.5 - OL)*S+1, w: 3.5 *S, h: 3.5 },
  { id: '23', type: 'square-2', top: 24,   left: (84.5 - OL)*S+1, w: 5   *S, h: 5.5 },
  { id: '70', type: 'square-2', top: 24,   left: (91   - OL)*S+1, w: 5   *S, h: 5.5 },
  { id: '22', type: 'square-2', top: 35,   left: (84.5 - OL)*S+1, w: 5   *S, h: 5.5 },
  { id: '21', type: 'rect-v-4', top: 46,   left: (84.5 - OL)*S+1, w: 5.5 *S, h: 11  },
  { id: '11', type: 'rect-v-4', top: 74.5, left: (78   - OL)*S+1, w: 5.5 *S, h: 11  },
  { id: '15', type: 'square-2', top: 57,   left: (91   - OL)*S+1, w: 5   *S, h: 5.5 },
  { id: '14', type: 'square-2', top: 68,   left: (91   - OL)*S+1, w: 5   *S, h: 5.5 },
  { id: '13', type: 'square-2', top: 79,   left: (91   - OL)*S+1, w: 5   *S, h: 5.5 },
  { id: '12', type: 'square-2', top: 90,   left: (91   - OL)*S+1, w: 5   *S, h: 5.5 },
];

const sortedTableIds = [
  '11', '12', '13', '14', '15', '21', '22', '23', '70', '65', '66', '67', '68', '1', '2', '3', '4', '51', '52', '53', '54'
];

// 時間文字列を分に変換する
const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// 指定日時に使用されている（重複含む）テーブルの取得
const getOccupiedTableIdsBase = (reservations: any[], dateStr: string, timeStr: string, excludeResId?: string) => {
  const targetMin = timeToMinutes(timeStr);
  const SESSION_DURATION = 120; // 2時間の滞在
  const ids: string[] = [];
  
  reservations
    .filter(r => {
      if (r.date !== dateStr || r.status !== 'confirmed' || r.id === excludeResId) return false;
      const rMin = timeToMinutes(r.time);
      return Math.abs(rMin - targetMin) < SESSION_DURATION;
    })
    .forEach(r => {
      ids.push(String(r.table_id).trim());
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

const isGroupAvailableBase = (group: TableGroup, reservations: any[], dateStr: string, timeStr: string, excludeResId?: string) => {
  const occupiedIds = getOccupiedTableIdsBase(reservations, dateStr, timeStr, excludeResId);
  const allGroupIds = [group.mainTable, ...group.combinedTables];
  return allGroupIds.every(id => !occupiedIds.includes(id));
};

// ─── renderGroupSelector をトップレベルに定義 ───
const renderGroupSelector = (
  guestsStr: string,
  dateStr: string,
  timeStr: string,
  selectedGroup: TableGroup | null,
  onSelectGroup: (g: TableGroup | null) => void,
  selectedSingleTable: string,
  onSelectSingleTable: (id: string) => void,
  occupiedIds: string[],
  excludeResId: string | undefined,
  reservations: any[],
  freeTableIds?: string[],
  onToggleFreeTable?: (id: string) => void,
) => {
  const n = parseInt(guestsStr, 10);
  const isFreeMode = n >= 9;
  
  const getGroupsForGuests = (gStr: string): TableGroup[] => {
    const num = parseInt(gStr, 10);
    if (!num || num <= 0) return [];
    const key = Math.min(num, 8) as keyof typeof GROUPS_BY_GUESTS;
    return GROUPS_BY_GUESTS[key] ?? [];
  };

  const groups = isFreeMode ? [] : getGroupsForGuests(guestsStr);
  const selectedGroupIds = selectedGroup
    ? new Set([selectedGroup.mainTable, ...selectedGroup.combinedTables])
    : new Set<string>();

  const recommendedIds = isFreeMode
    ? new Set<string>()
    : new Set(groups.flatMap(g => [g.mainTable, ...g.combinedTables]));

  const freeSelectedSet = new Set(freeTableIds ?? []);

  const handleMiniMapClick = (tableId: string) => {
    if (occupiedIds.includes(tableId)) return;

    if (isFreeMode) {
      onToggleFreeTable?.(tableId);
      return;
    }

    if (selectedGroupIds.has(tableId)) {
      onSelectGroup(null);
      return;
    }
    const matched = groups.find(g =>
      (g.mainTable === tableId || g.combinedTables.includes(tableId)) &&
      isGroupAvailableBase(g, reservations, dateStr, timeStr, excludeResId)
    );
    if (matched) onSelectGroup(matched);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] text-slate-400 font-bold">
          🗺️ テーブル選択{' '}
          <span className="text-amber-400">
            ({guestsStr}名{isFreeMode ? ' · 自由複数選択' : ' · おすすめ席'})
          </span>
        </label>
        {isFreeMode && freeSelectedSet.size > 0 && (
          <button
            type="button"
            onClick={() => onToggleFreeTable?.('__clear__')}
            className="text-[10px] text-slate-400 hover:text-rose-400 font-bold underline"
            style={{ cursor: 'pointer' }}
          >
            全解除
          </button>
        )}
      </div>

      <div
        className="relative w-full bg-slate-950 border border-slate-700 rounded-xl overflow-hidden"
        style={{ paddingBottom: '50%', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        {miniMapTables.map((t) => {
          const isOccupied = occupiedIds.includes(t.id);
          const isInGroup = selectedGroupIds.has(t.id);
          const isFreeSelected = freeSelectedSet.has(t.id);
          const isRecommended = !isFreeMode && recommendedIds.has(t.id) && !isOccupied;
          const isCounter = t.type === 'counter';
          const radius = isCounter ? '50%' : '4px';

          let bg = '#0f172a';
          let borderColor = '#1e293b';
          let color = '#334155';
          let boxShadow = 'none';
          let outline = 'none';

          if (isOccupied) {
            bg = '#7f1d1d'; borderColor = '#991b1b'; color = '#fca5a5';
          } else if (isInGroup || isFreeSelected) {
            bg = 'linear-gradient(135deg,#059669,#0d9488)';
            borderColor = '#34d399'; color = '#fff';
            boxShadow = '0 0 0 2px #34d39980';
            outline = '2px solid #34d399';
          } else if (isRecommended) {
            bg = '#172554'; borderColor = '#3b82f6'; color = '#93c5fd';
          } else if (isFreeMode) {
            bg = '#1e293b'; borderColor = '#475569'; color = '#94a3b8';
          }

          return (
            <div
              key={t.id}
              role="button"              
              tabIndex={0}               
              onClick={() => handleMiniMapClick(t.id)} 
              className="select-none touch-manipulation"
              style={{
                position: 'absolute',
                top: `${t.top}%`,
                left: `${t.left}%`,
                width: `${t.w}%`,
                height: `${t.h}%`,
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: radius,
                color,
                cursor: isOccupied ? 'not-allowed' : 'pointer',
                boxShadow,
                outline,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '7px',
                fontWeight: 900,
                transition: 'all 0.12s',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t.id}
            </div>
          );
        })}

        <div className="absolute bottom-1 left-1 flex items-center gap-2 pointer-events-none select-none">
          {!isFreeMode && (
            <span className="flex items-center gap-0.5 text-[7px] text-slate-500 font-bold">
              <span style={{width:8,height:8,borderRadius:2,background:'#172554',border:'1px solid #3b82f6',display:'inline-block'}} />推奨
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[7px] text-slate-500 font-bold">
            <span style={{width:8,height:8,borderRadius:2,background:'linear-gradient(135deg,#059669,#0d9488)',border:'1px solid #34d399',display:'inline-block'}} />選択中
          </span>
          <span className="flex items-center gap-0.5 text-[7px] text-slate-500 font-bold">
            <span style={{width:8,height:8,borderRadius:2,background:'#7f1d1d',border:'1px solid #991b1b',display:'inline-block'}} />埋まり
          </span>
        </div>
      </div>

      {isFreeMode && (
        <div className="mt-1.5 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 min-h-[28px]">
          {freeSelectedSet.size === 0 ? (
            <span className="text-[10px] text-slate-600 font-bold">テーブルをタップして選択してください</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-emerald-400 font-black">✓ 選択中:</span>
              {[...freeSelectedSet].map(id => (
                <span
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleFreeTable?.(id)}
                  className="text-[10px] font-black font-mono bg-emerald-800/60 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded cursor-pointer hover:bg-rose-900/60 hover:text-rose-300 hover:border-rose-700 transition-all select-none touch-manipulation"
                  style={{ cursor: 'pointer' }}
                  title="クリックで解除"
                >
                  {id} ✕
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!isFreeMode && selectedGroup && (
        <div className="mt-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-3 py-1.5 flex items-center justify-between">
          <span className="text-[11px] font-black text-emerald-300">
            ✓ {selectedGroup.label}
            <span className="text-emerald-500 font-medium ml-1">— {selectedGroup.description}</span>
          </span>
          <button 
            type="button" 
            onClick={() => onSelectGroup(null)}
            className="text-[10px] text-slate-400 hover:text-rose-400 font-bold underline ml-2"
            style={{ cursor: 'pointer' }}
          >
            解除
          </button>
        </div>
      )}

      {!isFreeMode && !selectedGroup && (
        <div className="mt-1.5 border-t border-slate-800 pt-1.5">
          <div className="text-[10px] text-slate-600 font-bold mb-1">▾ 推奨外のテーブルを個別指定</div>
          <select
            value={selectedSingleTable}
            onChange={(e) => onSelectSingleTable(e.target.value)}
            className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-blue-400 font-bold cursor-pointer font-mono text-xs"
            style={{ cursor: 'pointer' }}
          >
            {sortedTableIds.map(id => {
              if (occupiedIds.includes(id)) return null;
              return <option key={id} value={id}>{id}</option>;
            })}
          </select>
        </div>
      )}
    </div>
  );
};

// ─── スマホ幅（sm未満）専用のフロアマップグリッド用ゾーン定義 ───
// 使用頻度の高い順に上から並べる
const MOBILE_FLOOR_ZONES: string[][] = [
  ['65', '66', '67', '68'],
  ['11', '12', '13', '14', '15'],
  ['21', '22', '23', '70'],
  ['1', '2', '3', '4'],
  ['51', '52', '53', '54'],
];

interface MobileAdminViewProps {
  visibilityClassName: string;
  toggleForcedView: () => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  checkIsClosed: (dateStr: string) => boolean;
  formatPureDate: (dateStr: string) => string;
  getDateTopLabel: (dateStr: string) => string;
  changeDate: (days: number) => void;
  currentShift: 'lunch' | 'dinner';
  setCurrentShift: (shift: 'lunch' | 'dinner') => void;
  isSelectedDateLunchAllowed: boolean;
  handleGoToToday: () => void;
  setShowBusinessDaysModal: (v: boolean) => void;
  onlineEditMode: boolean;
  setOnlineEditMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  onlineOpenTablesToday: string[];
  onlineTablesSaving: string | null;
  toggleOnlineTable: (label: string) => void;
  openNewOrderModal: () => void;
  mobileTab: 'list' | 'floor' | 'customers' | 'history';
  setMobileTab: (tab: 'list' | 'floor' | 'customers' | 'history') => void;
  displaySideReservations: any[];
  totalLunchGuests: number;
  totalLunchCount: number;
  totalDinnerGuests: number;
  totalDinnerCount: number;
  isLunchTime: (timeStr: string) => boolean;
  formatShortTime: (timeStr: string) => string;
  getCleanNotes: (notesStr: string) => string;
  displayTableIds: (r: any) => string;
  tables: TableStatus[];
  reservations: any[];
  isSelectedDateClosed: boolean;
  setSelectedRes: (r: any) => void;
  setEditTime: (t: string) => void;
  setEditGuests: (g: string) => void;
  setEditTable: (t: string) => void;
  setEditSelectedGroup: (g: any) => void;
  filteredCustomerList: CustomerSummary[];
  customerSearchQuery: string;
  setCustomerSearchQuery: (q: string) => void;
  openCustomerEditModal: (c: CustomerSummary) => void;
  filteredReservations: any[];
  activeTab: 'today' | 'future' | 'all' | 'customers';
  setActiveTab: (t: 'today' | 'future' | 'all' | 'customers') => void;
}

function MobileAdminView(props: MobileAdminViewProps) {
  const {
    visibilityClassName,
    toggleForcedView,
    selectedDate, setSelectedDate, checkIsClosed, formatPureDate, getDateTopLabel, changeDate,
    currentShift, setCurrentShift, isSelectedDateLunchAllowed,
    handleGoToToday, setShowBusinessDaysModal, openNewOrderModal,
    onlineEditMode, setOnlineEditMode, onlineOpenTablesToday, onlineTablesSaving, toggleOnlineTable,
    mobileTab, setMobileTab,
    displaySideReservations, totalLunchGuests, totalLunchCount, totalDinnerGuests, totalDinnerCount,
    isLunchTime, formatShortTime, getCleanNotes, displayTableIds,
    tables, reservations, isSelectedDateClosed,
    setSelectedRes, setEditTime, setEditGuests, setEditTable, setEditSelectedGroup,
    filteredCustomerList, customerSearchQuery, setCustomerSearchQuery, openCustomerEditModal,
    filteredReservations,
  } = props;

  const totalGuests = currentShift === 'lunch' ? totalLunchGuests : totalDinnerGuests;
  const totalCount = currentShift === 'lunch' ? totalLunchCount : totalDinnerCount;

  const [showMobileCalendarPopup, setShowMobileCalendarPopup] = useState(false);
  const [mobileCalendarMonth, setMobileCalendarMonth] = useState(new Date());

  const generateMobileCalendarDays = (currentMonthDate: Date) => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // 月曜始まり
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysArray: ({ day: number; dateStr: string; isClosed: boolean } | null)[] = Array(firstDayIndex).fill(null);
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      daysArray.push({ day, dateStr, isClosed: checkIsClosed(dateStr) });
    }
    return daysArray;
  };

  const openReservation = (r: any) => {
    setSelectedRes(r);
    setEditTime(formatShortTime(r.time));
    setEditGuests(String(r.guests));
    setEditTable(String(r.table_id));
    setEditSelectedGroup(null);
  };

  const navItems: { key: 'list' | 'floor' | 'customers' | 'history'; icon: string; label: string }[] = [
    { key: 'list', icon: '📋', label: '予約一覧' },
    { key: 'floor', icon: '🗺️', label: 'フロアマップ' },
    { key: 'customers', icon: '👥', label: '顧客名簿' },
    { key: 'history', icon: '🗄️', label: '履歴' },
  ];

  return (
    <div className={`${visibilityClassName} fixed inset-0 bg-slate-950 text-slate-200 flex flex-col z-0`}>
      {/* スティッキーヘッダー */}
      <div className="shrink-0 px-4 pt-3.5 pb-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1 flex items-center justify-between">
          <button onClick={() => changeDate(-1)} style={{ cursor: 'pointer' }} className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-base">◀</button>
          <div className="flex flex-col items-center">
            <span className="text-[17px] font-black text-white">{formatPureDate(selectedDate)}</span>
            <span className="text-[10px] font-extrabold text-emerald-400">{getDateTopLabel(selectedDate) || ' '}</span>
          </div>
          <button onClick={() => changeDate(1)} style={{ cursor: 'pointer' }} className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-base">▶</button>
          </div>
          <div className="relative w-10 h-10 shrink-0">
            <button
              type="button"
              onClick={() => { setMobileCalendarMonth(new Date(selectedDate + 'T00:00:00')); setShowMobileCalendarPopup(!showMobileCalendarPopup); }}
              style={{ cursor: 'pointer' }}
              className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base"
            >
              📅
            </button>
            {showMobileCalendarPopup && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMobileCalendarPopup(false)} />
                <div className="absolute right-0 top-12 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 w-64">
                  <div className="flex justify-between items-center mb-2">
                    <button
                      type="button"
                      onClick={() => { const d = new Date(mobileCalendarMonth); d.setMonth(d.getMonth() - 1); setMobileCalendarMonth(d); }}
                      style={{ cursor: 'pointer' }}
                      className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                    >
                      &lt;
                    </button>
                    <span className="font-black text-xs text-amber-400">{mobileCalendarMonth.getFullYear()}年 {mobileCalendarMonth.getMonth() + 1}月</span>
                    <button
                      type="button"
                      onClick={() => { const d = new Date(mobileCalendarMonth); d.setMonth(d.getMonth() + 1); setMobileCalendarMonth(d); }}
                      style={{ cursor: 'pointer' }}
                      className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] border-b border-slate-800 pb-1 mb-1 text-slate-500">
                    <span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {generateMobileCalendarDays(mobileCalendarMonth).map((dayObj, index) => {
                      if (!dayObj) return <div key={`empty-${index}`} />;
                      const isSelected = dayObj.dateStr === selectedDate;
                      return (
                        <button
                          type="button"
                          key={dayObj.dateStr}
                          onClick={() => { setSelectedDate(dayObj.dateStr); setShowMobileCalendarPopup(false); }}
                          style={{ cursor: 'pointer' }}
                          className={`h-7 rounded text-[10px] font-bold flex items-center justify-center ${
                            isSelected
                              ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950 font-black'
                              : dayObj.isClosed
                                ? 'bg-slate-800/70 text-slate-600 line-through'
                                : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {dayObj.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {(mobileTab === 'list' || mobileTab === 'floor') && (
          <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800 mb-2">
            <button
              disabled={!isSelectedDateLunchAllowed}
              onClick={() => setCurrentShift('lunch')}
              style={{ cursor: isSelectedDateLunchAllowed ? 'pointer' : 'not-allowed' }}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-black transition ${!isSelectedDateLunchAllowed ? 'opacity-30 text-slate-500' : currentShift === 'lunch' ? 'bg-gradient-to-b from-orange-400 to-orange-500 text-slate-950' : 'text-slate-400'}`}
            >
              ☀️ 昼
            </button>
            <button
              onClick={() => setCurrentShift('dinner')}
              style={{ cursor: 'pointer' }}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-black transition ${currentShift === 'dinner' ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white' : 'text-slate-400'}`}
            >
              🌙 夜
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button onClick={handleGoToToday} style={{ cursor: 'pointer' }} className="flex-1 h-10 rounded-xl bg-white text-slate-700 text-[11px] font-black flex items-center justify-center gap-1">🏠 今日</button>
          <button onClick={() => setShowBusinessDaysModal(true)} style={{ cursor: 'pointer' }} className="flex-1 h-10 rounded-xl bg-slate-700 text-slate-100 text-[11px] font-black flex items-center justify-center gap-1">📅 営業日</button>
          <button onClick={openNewOrderModal} style={{ cursor: 'pointer' }} className="flex-1 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-emerald-950 text-[11px] font-black flex items-center justify-center gap-1">➕ 新規予約</button>
        </div>

        <div className="flex justify-end items-center gap-1.5 mt-2">
          <button
            onClick={() => { setOnlineEditMode(v => !v); setMobileTab('floor'); }}
            style={{ cursor: 'pointer' }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${onlineEditMode ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {onlineEditMode ? '✅ 編集を終了' : '🔒 オフライン'}
          </button>
          <button onClick={toggleForcedView} style={{ cursor: 'pointer' }} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black">
            💻 PC
          </button>
        </div>
      </div>

      {/* 本文 */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-24">

        {mobileTab === 'list' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[13px] font-black text-slate-100">{currentShift === 'lunch' ? '昼' : '夜'}の予約</span>
              <span className="text-[11px] font-black bg-slate-700 text-white px-2.5 py-0.5 rounded-full">{totalCount}件 / {totalGuests}名</span>
            </div>
            {isSelectedDateClosed ? (
              <p className="text-xs text-slate-500 italic text-center py-10">この日は定休日です</p>
            ) : displaySideReservations.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-10">この時間帯に予約はありません</p>
            ) : (
              <div className="flex flex-col gap-2">
                {displaySideReservations.map((r) => {
                  const colorClasses = getGuestCountColorClasses(r.guests);
                  const accent = colorClasses.split(' ')[0].replace('from-', 'border-');
                  return (
                    <div
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openReservation(r)}
                      style={{ cursor: 'pointer' }}
                      className={`flex items-center gap-3 bg-slate-900 border border-slate-800 border-l-4 ${accent} rounded-xl px-3.5 py-3`}
                    >
                      <div className="flex flex-col items-start shrink-0 w-11">
                        <span className="text-[13px] font-mono font-black text-slate-100">{formatShortTime(r.time)}</span>
                        <span className="text-[9px] font-extrabold text-slate-500">{isLunchTime(r.time) ? '昼' : '夜'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-white truncate">{r.guest_name}</div>
                        <div className="text-[10px] font-bold text-slate-500 mt-0.5">{r.guests}名</div>
                      </div>
                      <span className={`shrink-0 text-[11px] font-black px-2.5 py-1 rounded-full bg-gradient-to-br ${colorClasses.split(' ').slice(0, 2).join(' ')} text-white`}>
                        {displayTableIds(r)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {mobileTab === 'floor' && (
          <div className="p-4">
            {onlineEditMode && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-700 text-[10px] text-emerald-300 font-bold flex items-center justify-between gap-2">
                <span>🔓🔒 {formatPureDate(selectedDate)} の常連様テーブルをタップして切替</span>
                <button type="button" onClick={() => setOnlineEditMode(false)} className="shrink-0 bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded-lg" style={{ cursor: 'pointer' }}>
                  完了
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
              {GUEST_COUNT_LEGEND.map((g) => (
                <div key={g.label} className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${g.swatch}`} />
                  <span className="text-[10px] font-bold text-slate-400">{g.label}</span>
                </div>
              ))}
            </div>
            {isSelectedDateClosed && !onlineEditMode ? (
              <p className="text-xs text-slate-500 italic text-center py-10">この日は定休日です</p>
            ) : (
              MOBILE_FLOOR_ZONES.map((zoneIds, zi) => (
                <div key={zi} className="grid grid-cols-4 gap-2 mb-3.5">
                  {zoneIds.map((tid) => {
                    const t = tables.find((tt) => tt.id === tid);
                    if (!t) return null;

                    if (onlineEditMode) {
                      const isSpecial = SPECIAL_TABLES.includes(t.id);
                      if (!isSpecial) {
                        return (
                          <div key={tid} className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border bg-slate-900 border-slate-800 opacity-25">
                            <span className="text-xs font-black text-slate-600">{t.label}</span>
                          </div>
                        );
                      }
                      const isOpen = onlineOpenTablesToday.includes(t.id);
                      const isSaving = onlineTablesSaving === t.id;
                      return (
                        <div
                          key={tid}
                          role="button"
                          tabIndex={0}
                          onClick={() => !isSaving && toggleOnlineTable(t.id)}
                          style={{ cursor: isSaving ? 'wait' : 'pointer' }}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 ${
                            isOpen ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-700' : 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-900'
                          } ${isSaving ? 'opacity-50' : ''}`}
                        >
                          {!isOpen && <span className="text-sm leading-none">🔒</span>}
                          <span className="text-xs font-black text-white">{t.label}</span>
                        </div>
                      );
                    }

                    const attachedRes = reservations.find((r) => {
                      const matchBasic = r.date === selectedDate && r.status === 'confirmed' && (String(r.table_id).trim() === String(t.id).trim() || r.notes?.includes(`_combined:[${t.id}]`));
                      if (!matchBasic) return false;
                      return currentShift === 'lunch' ? isLunchTime(r.time) : !isLunchTime(r.time);
                    });
                    const colorClasses = attachedRes ? getGuestCountColorClasses(attachedRes.guests) : '';
                    return (
                      <div
                        key={tid}
                        role="button"
                        tabIndex={0}
                        onClick={() => attachedRes && openReservation(attachedRes)}
                        style={{ cursor: attachedRes ? 'pointer' : 'default' }}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border ${attachedRes ? `bg-gradient-to-br ${colorClasses.split(' ').slice(0, 2).join(' ')} border-transparent` : 'bg-slate-900 border-slate-800'}`}
                      >
                        <span className={`text-xs font-black ${attachedRes ? 'text-white' : 'text-slate-600'}`}>{t.label}</span>
                        <span className={`text-[8px] font-extrabold ${attachedRes ? 'text-white/85' : 'text-slate-600'}`}>{attachedRes ? `${attachedRes.guests}名` : '空席'}</span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {mobileTab === 'customers' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[13px] font-black text-slate-100">👥 顧客名簿</span>
              <span className="text-[11px] font-black bg-slate-700 text-white px-2.5 py-0.5 rounded-full">{filteredCustomerList.length}名</span>
            </div>
            <input
              type="text"
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              placeholder="🔍 名前・会社名・メールアドレスで検索"
              className="w-full mb-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <div className="flex flex-col gap-2">
              {filteredCustomerList.map((c, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCustomerEditModal(c)}
                  style={{ cursor: 'pointer' }}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-extrabold text-white">{c.guest_name}</span>
                    <span className="text-[10px] font-black font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full">{c.total_visits}回</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">{c.email}</div>
                  {c.company_name && <div className="text-[10px] text-slate-600 mt-0.5">{c.company_name}</div>}
                </div>
              ))}
              {filteredCustomerList.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-10">該当する顧客が見つかりません</p>
              )}
            </div>
          </div>
        )}

        {mobileTab === 'history' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[13px] font-black text-slate-100">🗄️ すべての予約履歴</span>
              <span className="text-[11px] font-black bg-slate-700 text-white px-2.5 py-0.5 rounded-full">{filteredReservations.length}件</span>
            </div>
            <div className="flex flex-col gap-2">
              {[...filteredReservations].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((r) => {
                const cleanNote = getCleanNotes(r.notes);
                return (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openReservation(r)}
                    style={{ cursor: 'pointer' }}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-black text-amber-500">{r.date} {formatShortTime(r.time)}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${r.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{r.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-white truncate">{r.guest_name}</span>
                      <span className="text-[10px] font-mono font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md shrink-0">{displayTableIds(r)}</span>
                    </div>
                    {cleanNote && <div className="text-[10px] text-amber-500/80 mt-1 truncate">{cleanNote}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ボトムナビゲーション */}
      <div className="shrink-0 flex bg-slate-900 border-t border-slate-800 px-1 pt-2 pb-3.5">
        {navItems.map((item) => {
          const isActive = mobileTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setMobileTab(item.key)}
              style={{ cursor: 'pointer' }}
              className="flex-1 flex flex-col items-center gap-0.5 py-1"
            >
              <span className={`text-lg ${isActive ? '' : 'opacity-50'}`}>{item.icon}</span>
              <span className={`text-[9px] font-black ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'future' | 'all' | 'customers'>('today');
  // 「今後の予約一覧」タブ内で、未来／過去のどちらを表示するか（デスクトップの「過去の予約」トグル用）
  const [futureListMode, setFutureListMode] = useState<'upcoming' | 'past'>('upcoming');

  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayString());
  const [reservations, setReservations] = useState<any[]>([]);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentShift, setCurrentShift] = useState<'dinner' | 'lunch'>('dinner');

  const [selectedRes, setSelectedRes] = useState<any | null>(null);
  const [editTime, setEditTime] = useState('18:00');
  const [editGuests, setEditGuests] = useState('2');
  const [editTable, setEditTable] = useState('51');
  const [editSelectedGroup, setEditSelectedGroup] = useState<TableGroup | null>(null);
  
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderStep, setNewOrderStep] = useState<'guests' | 'details'>('guests'); 
  const [newOrderDate, setNewOrderDate] = useState(() => getTodayString());
  const [newOrderName, setNewOrderName] = useState('');
  const [newOrderGuests, setNewOrderGuests] = useState('2'); 
  const [newOrderTime, setNewOrderTime] = useState('18:00');
  const [newOrderTable, setNewOrderTable] = useState('51');
  const [newOrderSelectedGroup, setNewOrderSelectedGroup] = useState<TableGroup | null>(null);
  const [newOrderFreeTableIds, setNewOrderFreeTableIds] = useState<string[]>([]);

  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [showMainCalendarPopup, setShowMainCalendarPopup] = useState(false);
  const [mainCalendarMonth, setMainCalendarMonth] = useState(new Date());

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // ─── PC版/モバイル版の手動切り替え ───
  const [forcedView, setForcedView] = useState<'pc' | 'mobile'>('pc');
  useEffect(() => {
    // 画面幅による自動判定はせず、保存された選択があればそれを使い、なければ常にPC版をデフォルトにする
    const saved = localStorage.getItem('adminForcedView');
    if (saved === 'pc' || saved === 'mobile') {
      setForcedView(saved);
    }
  }, []);
  const toggleForcedView = () => {
    const next = forcedView === 'pc' ? 'mobile' : 'pc';
    setForcedView(next);
    localStorage.setItem('adminForcedView', next);
  };
  const desktopVisibilityClass = forcedView === 'pc' ? 'block' : 'hidden';
  const mobileVisibilityClass = forcedView === 'mobile' ? 'block' : 'hidden';

  // ─── スマホ向けボトムナビの選択状態（activeTabと連動させる） ───
  const [mobileTabState, setMobileTabState] = useState<'list' | 'floor' | 'customers' | 'history'>('list');
  const setMobileTab = (tab: 'list' | 'floor' | 'customers' | 'history') => {
    setMobileTabState(tab);
    if (tab === 'list' || tab === 'floor') setActiveTab('today');
    else if (tab === 'customers') setActiveTab('customers');
    else setActiveTab('all');
  };
  const [editingCustomer, setEditingCustomer] = useState<CustomerSummary | null>(null);
  const [ceName, setCeName] = useState('');
  const [ceEmail, setCeEmail] = useState('');
  const [cePhone, setCePhone] = useState('');
  const [ceCompany, setCeCompany] = useState('');
  const [ceNotes, setCeNotes] = useState('');
  const [ceSaving, setCeSaving] = useState(false);

  // ─── 営業日（特定日の営業/休業）管理 ───
  const [closedWeekDays, setClosedWeekDays] = useState<number[]>([]);
  const [businessDayOverrides, setBusinessDayOverrides] = useState<{ date: string; is_closed: boolean }[]>([]);
  const [showBusinessDaysModal, setShowBusinessDaysModal] = useState(false);
  const [bdStartDate, setBdStartDate] = useState(() => getTodayString());
  const [bdEndDate, setBdEndDate] = useState(() => getTodayString());
  const [bdIsClosed, setBdIsClosed] = useState(true);
  const [bdPendingEntries, setBdPendingEntries] = useState<{ startDate: string; endDate: string; is_closed: boolean }[]>([]);
  const [bdSaving, setBdSaving] = useState(false);
  const [bdShowCalendarPopup, setBdShowCalendarPopup] = useState(false);
  const [bdCalendarMonth, setBdCalendarMonth] = useState(new Date());
  const [bdShowEndCalendarPopup, setBdShowEndCalendarPopup] = useState(false);
  const [bdEndCalendarMonth, setBdEndCalendarMonth] = useState(new Date());
  const [bdCalendarPos, setBdCalendarPos] = useState<{ top: number; left: number } | null>(null);
  const [bdEndCalendarPos, setBdEndCalendarPos] = useState<{ top: number; left: number } | null>(null);
  const bdStartFieldRef = useRef<HTMLDivElement>(null);
  const bdEndFieldRef = useRef<HTMLDivElement>(null);

  // ─── 常連様専用テーブルのオンライン予約公開設定（日付ごと） ───
  const [onlineEditMode, setOnlineEditMode] = useState(false);
  const [onlineOpenTablesToday, setOnlineOpenTablesToday] = useState<string[]>([]);
  const [onlineTablesSaving, setOnlineTablesSaving] = useState<string | null>(null);

  const fetchOnlineTableSettings = async (dateStr: string) => {
    try {
      const res = await fetch(`/api/admin/online-booking-settings?date=${dateStr}`);
      const data = await res.json();
      setOnlineOpenTablesToday(data.openTables || []);
    } catch (err) {
      console.error('公開テーブル設定の取得に失敗:', err);
    }
  };

  const toggleOnlineTable = async (label: string) => {
    const nextOpen = !onlineOpenTablesToday.includes(label);
    setOnlineTablesSaving(label);
    try {
      const res = await fetch('/api/admin/online-booking-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, tableLabel: label, isOpen: nextOpen }),
      });
      if (!res.ok) throw new Error('API Error');
      setOnlineOpenTablesToday(prev => nextOpen ? [...prev, label] : prev.filter(id => id !== label));
    } catch (err) {
      console.error(err);
      alert('テーブルの公開設定の更新に失敗しました。');
    } finally {
      setOnlineTablesSaving(null);
    }
  };

  useEffect(() => {
    if (onlineEditMode) fetchOnlineTableSettings(selectedDate);
  }, [onlineEditMode, selectedDate]);

  const openBdStartCalendar = () => {
    const rect = bdStartFieldRef.current?.getBoundingClientRect();
    if (rect) setBdCalendarPos({ top: rect.bottom + 4, left: rect.left });
    setBdShowCalendarPopup(true);
    setBdShowEndCalendarPopup(false);
  };

  const openBdEndCalendar = () => {
    const rect = bdEndFieldRef.current?.getBoundingClientRect();
    if (rect) setBdEndCalendarPos({ top: rect.bottom + 4, left: rect.right - 288 });
    setBdShowEndCalendarPopup(true);
    setBdShowCalendarPopup(false);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isCombineMode, setIsCombineMode] = useState(false); 
  const [hasMovedSignificantly, setHasMovedSignificantly] = useState(false);

  const initialTables: TableStatus[] = [
    { id: '51', label: '51', isOccupied: false, type: 'rect-h-4', top: '4%', left: '17%',   width: '9.4%' },
    { id: '52', label: '52', isOccupied: false, type: 'rect-h-4', top: '4%', left: '27.4%', width: '9.4%' },
    { id: '53', label: '53', isOccupied: false, type: 'rect-h-4', top: '4%', left: '37.8%', width: '9.4%' },
    { id: '54', label: '54', isOccupied: false, type: 'rect-h-4', top: '4%', left: '48.2%', width: '9.4%' },
    { id: '68', label: '68', isOccupied: false, type: 'rect-h-4', top: '4%', left: '58.6%', width: '9.4%' },
    { id: '67', label: '67', isOccupied: false, type: 'rect-h-4', top: '4%', left: '69%',   width: '9.4%' },
    { id: '66', label: '66', isOccupied: false, type: 'rect-h-4', top: '4%', left: '79.4%', width: '9.4%' },
    { id: '65', label: '65', isOccupied: false, type: 'rect-h-4', top: '4%', left: '89.8%', width: '9.4%' },
    { id: '1', label: '1', isOccupied: false, type: 'counter-1', top: '24%', left: '78.5%', width: '3.5%' },
    { id: '2', label: '2', isOccupied: false, type: 'counter-1', top: '32%', left: '78.5%', width: '3.5%' },
    { id: '3', label: '3', isOccupied: false, type: 'counter-1', top: '40%', left: '78.5%', width: '3.5%' },
    { id: '4', label: '4', isOccupied: false, type: 'counter-1', top: '48%', left: '78.5%', width: '3.5%' },
    { id: '22', label: '22', isOccupied: false, type: 'square-2', top: '35.8%', left: '68%',   width: '7.5%' },
    { id: '21', label: '21', isOccupied: false, type: 'rect-h-4', top: '35.8%', left: '83%',   width: '13.6%' },
    { id: '23', label: '23', isOccupied: false, type: 'square-2', top: '51.7%', left: '68%',   width: '7.5%' },
    { id: '70', label: '70', isOccupied: false, type: 'square-2', top: '51.7%', left: '83%',   width: '7.5%' },
    { id: '15', label: '15', isOccupied: false, type: 'square-2', top: '51.7%', left: '91.5%', width: '7.5%' },
    { id: '11', label: '11', isOccupied: false, type: 'rect-h-4', top: '67.6%', left: '68%',   width: '13.6%' },
    { id: '14', label: '14', isOccupied: false, type: 'square-2', top: '67.6%', left: '82.6%', width: '7.5%' },
    { id: '13', label: '13', isOccupied: false, type: 'square-2', top: '83.5%', left: '68%',   width: '7.5%' },
    { id: '12', label: '12', isOccupied: false, type: 'square-2', top: '83.5%', left: '76.5%', width: '7.5%' },
  ];

  const lunchTimes = ['11:45', '12:00', '12:15', '12:30', '12:45', '13:00'];
  const dinnerTimes = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
  const availableTimes = [...lunchTimes, ...dinnerTimes];

  const isLunchTime = (timeStr: string) => {
    if (!timeStr) return false;
    const hour = parseInt(timeStr.split(':')[0], 10);
    return hour < 15; 
  };

  const isLunchDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 1 || day === 4 || day === 5; 
  };

  useEffect(() => {
    if (!isLunchDay(selectedDate) && currentShift === 'lunch') {
      setCurrentShift('dinner');
    }
  }, [selectedDate, currentShift]);

  const formatShortTime = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    return parts.length >= 2 ? `${parts[0].trim().padStart(2, '0')}:${parts[1].trim().padStart(2, '0')}` : timeStr;
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`);
  };

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reservations');
      const data = await res.json();
      const allRes = data.reservations || [];
      
      const mappedReservations = allRes.map((item: any) => {
        const dbId = Number(item.table_id);
        const mappedLabel = DB_ID_TO_LABEL[dbId] || String(item.table_id);
        return {
          ...item,
          table_id: mappedLabel, 
          email: item.email || 'customer@example.com',
          visit_count: item.visit_count ?? Math.floor(Math.random() * 5) + 1
        };
      });

      setReservations(mappedReservations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // ─── 追加：5秒ごとに自動で最新データをロードして画面を更新する（リアルタイム同期） ───
    const interval = setInterval(() => {
      loadData();
    }, 5000); // 5000ミリ秒 ＝ 5秒

    return () => clearInterval(interval);
  }, [selectedDate, currentShift]);

  async function loadBusinessDays() {
    try {
      const res = await fetch('/api/business-hours');
      const data = await res.json();
      if (data.closedDays) setClosedWeekDays(data.closedDays);
      if (data.overrides) setBusinessDayOverrides(data.overrides);
    } catch (err) {
      console.error('営業日データの読み込みに失敗しました:', err);
    }
  }

  useEffect(() => {
    loadBusinessDays();
  }, []);

  const overridesMap: Record<string, boolean> = {};
  businessDayOverrides.forEach((o) => { overridesMap[o.date] = o.is_closed; });

  // 開始日の変更時、終了日を自動で開始日に揃える（単日入力を基本にしつつ、必要なら終了日側だけ後から伸ばせる）
  const handleBdStartDateChange = (dateStr: string) => {
    setBdStartDate(dateStr);
    setBdEndDate(dateStr);
  };

  const handleAddBdEntry = () => {
    const endDate = bdEndDate || bdStartDate;
    if (endDate < bdStartDate) {
      alert('終了日は開始日以降の日付を指定してください。');
      return;
    }

    if (bdIsClosed) {
      const affected = reservations.filter(
        (r) => r.status === 'confirmed' && r.date >= bdStartDate && r.date <= endDate
      );
      if (affected.length > 0) {
        const rangeLabel = endDate !== bdStartDate ? `${bdStartDate} 〜 ${endDate}` : bdStartDate;
        const proceed = window.confirm(
          `${rangeLabel} には既に ${affected.length} 件の予約が入っています。休業に設定しますか？`
        );
        if (!proceed) return;
      }
    }

    setBdPendingEntries((prev) => [...prev, { startDate: bdStartDate, endDate, is_closed: bdIsClosed }]);
    handleBdStartDateChange(getTodayString());
  };

  const handleRemoveBdEntry = (index: number) => {
    setBdPendingEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveBdEntries = async () => {
    if (bdPendingEntries.length === 0) return;
    setBdSaving(true);
    try {
      await Promise.all(bdPendingEntries.map((entry) =>
        fetch('/api/admin/business-days', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: entry.startDate, endDate: entry.endDate, is_closed: entry.is_closed }),
        })
      ));
      setBdPendingEntries([]);
      await loadBusinessDays();
    } catch (err) {
      console.error(err);
      alert('営業日の保存に失敗しました。');
    } finally {
      setBdSaving(false);
    }
  };

  const handleDeleteOverride = async (date: string) => {
    try {
      await fetch('/api/admin/business-days', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      await loadBusinessDays();
    } catch (err) {
      console.error(err);
      alert('解除に失敗しました。');
    }
  };

  useEffect(() => {
    const targetReservations = reservations.filter((r: any) => {
      const matchDate = r.date === selectedDate && r.status === 'confirmed';
      if (!matchDate) return false;
      if (currentShift === 'lunch') return isLunchTime(r.time);
      return !isLunchTime(r.time);
    });

    const updatedTables = initialTables.map(t => {
      const isOccupied = targetReservations.some((r: any) => {
        const tableIdStr = String(r.table_id).trim();
        const notesStr = String(r.notes || '');
        return tableIdStr === t.id || notesStr.includes(`_combined:[${t.id}]`);
      });
      return { ...t, isOccupied };
    });
    setTables(updatedTables);
  }, [reservations, selectedDate, currentShift]);

  const getOccupiedTableIds = (dateStr: string, timeStr: string, excludeResId?: string) => {
    const targetMin = timeToMinutes(timeStr);
    const SESSION_DURATION = 120; // 2時間重複判定
    const ids: string[] = [];
    
    reservations
      .filter(r => {
        if (r.date !== dateStr || r.status !== 'confirmed' || r.id === excludeResId) return false;
        const rMin = timeToMinutes(r.time);
        return Math.abs(rMin - targetMin) < SESSION_DURATION;
      })
      .forEach(r => {
        ids.push(String(r.table_id).trim());
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

  const displayTableIds = (resItem: any) => {
    if (!resItem) return '';
    const baseTableId = String(resItem.table_id).trim();
    const labels: string[] = [`${baseTableId}`];
    
    const matches = resItem.notes?.match(/_combined:\[(.*?)\]/g);
    if (matches) {
      matches.forEach((m: string) => {
        const id = m.replace('_combined:[', '').replace(']', '').trim();
        if (id) labels.push(`${id}`);
      });
    }
    return labels.join(', ');
  };

  const isGroupAvailable = (group: TableGroup, dateStr: string, timeStr: string, excludeResId?: string) => {
    const occupiedIds = getOccupiedTableIds(dateStr, timeStr, excludeResId);
    const allGroupIds = [group.mainTable, ...group.combinedTables];
    return allGroupIds.every(id => !occupiedIds.includes(id));
  };

  const buildCombinedNotes = (group: TableGroup, existingNotes: string = '') => {
    const cleanNotes = existingNotes.replace(/_combined:\[.*?\]/g, '').trim();
    const combinedTags = group.combinedTables.map(id => `_combined:[${id}]`).join(' ');
    return cleanNotes ? `${cleanNotes} ${combinedTags}` : combinedTags;
  };

  // fromId → toId のドラッグと同じ相対位置の移動を targetId に適用した場合、対応するテーブルIDを返す
  const findTableAtRelativeOffset = (fromId: string, toId: string, targetId: string): string | null => {
    const fromT = initialTables.find(t => t.id === fromId);
    const toT = initialTables.find(t => t.id === toId);
    const targetT = initialTables.find(t => t.id === targetId);
    if (!fromT || !toT || !targetT) return null;

    const deltaTop = parseFloat(toT.top) - parseFloat(fromT.top);
    const deltaLeft = parseFloat(toT.left) - parseFloat(fromT.left);
    const expectedTop = parseFloat(targetT.top) + deltaTop;
    const expectedLeft = parseFloat(targetT.left) + deltaLeft;

    const EPS = 0.6;
    const match = initialTables.find(t =>
      Math.abs(parseFloat(t.top) - expectedTop) < EPS && Math.abs(parseFloat(t.left) - expectedLeft) < EPS
    );
    return match ? match.id : null;
  };

  // 連結グループのサブテーブルをドラッグしたとき、グループ全体を相対位置を保ったまま移動できるか計算する
  // いずれかのメンバーの移動先が見つからない・埋まっている・重複する場合は null（移動不可）を返す
  const computeGroupParallelMove = (
    draggedId: string,
    targetId: string,
    mainId: string,
    subIds: string[],
    occupiedIds: string[]
  ): { newMainId: string; newSubIds: string[] } | null => {
    const allMembers = [mainId, ...subIds];
    const usedTargets = new Set<string>([targetId]);
    const destinationById: Record<string, string> = { [draggedId]: targetId };

    for (const memberId of allMembers) {
      if (memberId === draggedId) continue;
      const dest = findTableAtRelativeOffset(draggedId, targetId, memberId);
      if (!dest || occupiedIds.includes(dest) || usedTargets.has(dest)) return null;
      usedTargets.add(dest);
      destinationById[memberId] = dest;
    }

    return {
      newMainId: destinationById[mainId],
      newSubIds: subIds.map(id => destinationById[id]),
    };
  };

  const resetDragState = () => {
    setDraggingTableId(null);
    setHoveredTableId(null);
    setIsCombineMode(false);
    setDragPosition({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent, table: TableStatus) => {
    if (isSelectedDateClosed || !table.isOccupied) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    try {
      if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (err) {
      console.warn('Pointer capture is not fully supported or failed:', err);
    }

    setDraggingTableId(table.id);
    setIsCombineMode(false); 
    setHasMovedSignificantly(false);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragPosition({ x: 0, y: 0 });

    longPressTimer.current = setTimeout(() => {
      setIsCombineMode(true);
    }, 450); 
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTableId) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    setDragPosition({ x: deltaX, y: deltaY });

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      setHasMovedSignificantly(true);
      if (!isCombineMode) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    }

    if (mapContainerRef.current) {
      const x = e.clientX;
      const y = e.clientY;
      let foundHoverId: string | null = null;

      // 連結モード中は、ドラッグ元と同じグループの別テーブルにも重ねられるようにする（そこへ統合するため）
      let sameGroupMemberIds: string[] = [];
      if (isCombineMode) {
        const currentShiftReservations = reservations.filter(r => r.date === selectedDate && r.status === 'confirmed' && (currentShift === 'lunch' ? isLunchTime(r.time) : !isLunchTime(r.time)));
        const draggedRes = currentShiftReservations.find(r =>
          String(r.table_id).trim() === String(draggingTableId).trim() || r.notes?.includes(`_combined:[${draggingTableId}]`)
        );
        if (draggedRes) {
          const subIds = (draggedRes.notes?.match(/_combined:\[(.*?)\]/g) || [])
            .map((m: string) => m.replace('_combined:[', '').replace(']', '').trim())
            .filter(Boolean);
          sameGroupMemberIds = [String(draggedRes.table_id).trim(), ...subIds];
        }
      }

      tables.forEach(t => {
        if (t.id === draggingTableId) return;
        if (t.isOccupied && !sameGroupMemberIds.includes(t.id)) return;

        const el = document.getElementById(`table-target-${t.id}`);
        if (el) {
          const tRect = el.getBoundingClientRect();
          if (x >= tRect.left && x <= tRect.right && y >= tRect.top && y <= tRect.bottom) {
            foundHoverId = t.id;
          }
        }
      });
      setHoveredTableId(foundHoverId);
    }
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!draggingTableId) return;

    const activeDraggingTableId = draggingTableId;
    const activeHoveredTableId = hoveredTableId;
    const activeIsCombineMode = isCombineMode;

    const currentShiftReservations = reservations.filter(r => r.date === selectedDate && r.status === 'confirmed' && (currentShift === 'lunch' ? isLunchTime(r.time) : !isLunchTime(r.time)));

    try {
      if (e.currentTarget && typeof e.currentTarget.releasePointerCapture === 'function') {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}

    resetDragState();

    if (activeIsCombineMode && activeHoveredTableId) {
      const foundRes = currentShiftReservations.find(r =>
        String(r.table_id).trim() === String(activeDraggingTableId).trim() || r.notes?.includes(`_combined:[${activeDraggingTableId}]`)
      );

      if (foundRes) {
        const currentNotes = foundRes.notes || '';
        const subIds = (currentNotes.match(/_combined:\[(.*?)\]/g) || [])
          .map((m: string) => m.replace('_combined:[', '').replace(']', '').trim())
          .filter(Boolean);
        const isSameGroupTarget = String(foundRes.table_id).trim() === String(activeHoveredTableId).trim() || subIds.includes(activeHoveredTableId);

        if (isSameGroupTarget) {
          // 同じグループの別テーブルに重ねた場合：重ねた先の1テーブルに統合する（連結タグは全て解除）
          const updatedNotes = getCleanNotes(currentNotes);

          try {
            // ─── 追加：テーブル統合をデータベースに送る ───
            const res = await fetch('/api/admin/reservations', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: foundRes.id, table_id: LABEL_TO_DB_ID[activeHoveredTableId] ?? activeHoveredTableId, notes: updatedNotes }),
            });
            if (!res.ok) throw new Error('API Error');

            setReservations(prev => prev.map(r => r.id === foundRes.id ? { ...r, table_id: activeHoveredTableId, notes: updatedNotes } : r));
          } catch (err) {
            console.error(err);
            alert('テーブルの統合に失敗しました。');
          }
        } else {
          const updatedNotes = `${currentNotes} _combined:[${activeHoveredTableId}]`.trim();

          try {
            // ─── 追加：テーブル連結をデータベースに送る ───
            const res = await fetch('/api/admin/reservations', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: foundRes.id, notes: updatedNotes }),
            });
            if (!res.ok) throw new Error('API Error');

            setReservations(prev => prev.map(r => r.id === foundRes.id ? { ...r, notes: updatedNotes } : r));
          } catch (err) {
            console.error(err);
            alert('テーブルの連結に失敗しました。');
          }
        }
      }
    }
    else if (!activeIsCombineMode && activeHoveredTableId) {
      // メイン・サブどちらをドラッグしても、連結グループ全体を相対位置を保ったまま平行移動する
      const newTableId = activeHoveredTableId;
      const foundRes = currentShiftReservations.find(r =>
        String(r.table_id).trim() === String(activeDraggingTableId).trim() || r.notes?.includes(`_combined:[${activeDraggingTableId}]`)
      );

      if (foundRes) {
        const mainId = String(foundRes.table_id).trim();
        const subIds = (foundRes.notes?.match(/_combined:\[(.*?)\]/g) || [])
          .map((m: string) => m.replace('_combined:[', '').replace(']', '').trim())
          .filter(Boolean);

        if (subIds.length === 0) {
          // 連結なしの単独予約：そのまま移動
          try {
            // ─── 追加：テーブル移動をデータベースに送る ───
            const res = await fetch('/api/admin/reservations', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: foundRes.id, table_id: LABEL_TO_DB_ID[newTableId] ?? newTableId }),
            });
            if (!res.ok) throw new Error('API Error');

            setReservations(prev => prev.map(r => r.id === foundRes.id ? { ...r, table_id: newTableId } : r));
          } catch (err) {
            console.error(err);
            alert('テーブルの移動に失敗しました。');
          }
        } else {
          const occupiedIds = getOccupiedTableIds(foundRes.date, foundRes.time, foundRes.id);
          const plan = computeGroupParallelMove(activeDraggingTableId, newTableId, mainId, subIds, occupiedIds);

          if (!plan) {
            alert('グループ全体を移動できる配置が見つかりませんでした。');
          } else {
            const cleanNotes = getCleanNotes(foundRes.notes);
            const newTags = plan.newSubIds.map(id => `_combined:[${id}]`).join(' ');
            const updatedNotes = cleanNotes ? `${cleanNotes} ${newTags}`.trim() : newTags;

            try {
              // ─── 追加：グループ全体の平行移動をデータベースに送る ───
              const res = await fetch('/api/admin/reservations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: foundRes.id, table_id: LABEL_TO_DB_ID[plan.newMainId] ?? plan.newMainId, notes: updatedNotes }),
              });
              if (!res.ok) throw new Error('API Error');

              setReservations(prev => prev.map(r => r.id === foundRes.id ? { ...r, table_id: plan.newMainId, notes: updatedNotes } : r));
            } catch (err) {
              console.error(err);
              alert('グループの移動に失敗しました。');
            }
          }
        }
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    try {
      if (e.currentTarget && typeof e.currentTarget.releasePointerCapture === 'function') {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    resetDragState();
  };

  const handleTableClick = async (table: TableStatus) => {
    if (onlineEditMode) {
      if (SPECIAL_TABLES.includes(table.id)) toggleOnlineTable(table.id);
      return;
    }
    if (draggingTableId || hasMovedSignificantly) return;
    if (isSelectedDateClosed) return;

    const currentShiftReservations = reservations.filter(r => r.date === selectedDate && r.status === 'confirmed' && (currentShift === 'lunch' ? isLunchTime(r.time) : !isLunchTime(r.time)));

    if (table.isOccupied) {
      const foundRes = currentShiftReservations.find(r =>
        String(r.table_id).trim() === String(table.id).trim() || r.notes?.includes(`_combined:[${table.id}]`)
      );
      if (foundRes) {
        if (String(foundRes.table_id).trim() !== String(table.id).trim()) {
          const currentNotes = foundRes.notes || '';
          const targetTag = `_combined:[${table.id}]`;
          const updatedNotes = currentNotes.replace(targetTag, '').replace(/\s+/g, ' ').trim();

          try {
            // ─── 追加：連結解除をデータベースに送る ───
            const res = await fetch('/api/admin/reservations', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: foundRes.id, notes: updatedNotes }),
            });
            if (!res.ok) throw new Error('API Error');

            setReservations(prev => prev.map(r => r.id === foundRes.id ? { ...r, notes: updatedNotes } : r));
          } catch (err) {
            console.error(err);
            alert('テーブルの連結解除に失敗しました。');
          }
          return;
        }

        setSelectedRes(foundRes);
        setEditTime(formatShortTime(foundRes.time));
        setEditGuests(String(foundRes.guests));
        setEditTable(String(foundRes.table_id));
        setEditSelectedGroup(null);
      }
    } else {
      const defaultTime = '18:00';
      setNewOrderTable(table.id);
      setNewOrderDate(selectedDate);
      setNewOrderName('');
      setNewOrderGuests('0');
      setNewOrderTime(defaultTime);
      setCurrentCalendarMonth(new Date(selectedDate));
      setShowCalendarPopup(false);
      setNewOrderStep('guests'); 
      setNewOrderSelectedGroup(null);
      setNewOrderFreeTableIds([]);
      setShowNewOrderModal(true);
    }
  };

  useEffect(() => {
    if (!showNewOrderModal || newOrderStep === 'guests') return;
    const occupiedIds = getOccupiedTableIds(newOrderDate, newOrderTime);
    if (occupiedIds.includes(String(newOrderTable).trim())) {
      const fallbackId = sortedTableIds.find(id => !occupiedIds.includes(id));
      if (fallbackId) setNewOrderTable(fallbackId);
    }
    if (newOrderSelectedGroup && !isGroupAvailable(newOrderSelectedGroup, newOrderDate, newOrderTime)) {
      setNewOrderSelectedGroup(null);
      setNewOrderFreeTableIds([]);
    }
  }, [newOrderDate, newOrderTime, showNewOrderModal, newOrderStep, reservations]);

  useEffect(() => {
    if (!selectedRes) return;
    const occupiedIds = getOccupiedTableIds(selectedRes.date, editTime, selectedRes.id);
    if (occupiedIds.includes(String(editTable).trim())) {
      const fallbackId = sortedTableIds.find(id => !occupiedIds.includes(id));
      if (fallbackId) setEditTable(fallbackId);
    }
    if (editSelectedGroup && !isGroupAvailable(editSelectedGroup, selectedRes.date, editTime, selectedRes.id)) {
      setEditSelectedGroup(null);
    }
  }, [editTime, reservations]);

 const handleCancelReservation = async (id: string, guestName: string) => {
    if (!confirm(guestName + '様 の予約をキャンセルしますか？')) return;
    try {
      // ─── 追加：データベースにキャンセルの指令を送る ───
      const res = await fetch('/api/admin/reservations/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (!res.ok) throw new Error('API Error');

      // 画面上の表示もキャンセル状態に切り替える
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
      setSelectedRes(null);
    } catch (err) {
      console.error(err);
      alert('予約キャンセル処理に失敗しました。');
    }
  };

  const handleUpdateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes) return;

    const occupiedIds = getOccupiedTableIds(selectedRes.date, editTime, selectedRes.id);

    let finalTableId = editTable;
    let finalNotes = getCleanNotes(selectedRes.notes);

    if (editSelectedGroup) {
      const allGroupIds = [editSelectedGroup.mainTable, ...editSelectedGroup.combinedTables];
      const conflict = allGroupIds.find(id => occupiedIds.includes(id));
      if (conflict) {
        alert(`⚠️ テーブル ${conflict} はすでに埋まっています。`);
        return;
      }
      finalTableId = editSelectedGroup.mainTable;
      finalNotes = buildCombinedNotes(editSelectedGroup, getCleanNotes(selectedRes.notes));
    } else {
      if (occupiedIds.includes(String(editTable).trim())) {
        alert(`⚠️ テーブル番号 ${editTable} はすでに埋まっています。`);
        return;
      }
    }

    try {
      // ─── 追加：データベースに変更内容を送る ───
      const res = await fetch('/api/admin/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRes.id,
          time: editTime,
          guests: Number(editGuests),
          table_id: LABEL_TO_DB_ID[finalTableId] ?? finalTableId,
          notes: finalNotes,
        })
      });
      if (!res.ok) throw new Error('API Error');

      setReservations(prev => prev.map(r => r.id === selectedRes.id ? {
        ...r,
        time: editTime,
        guests: Number(editGuests),
        table_id: finalTableId,
        notes: finalNotes,
      } : r));
    } catch (err) {
      console.error(err);
      alert('予約変更処理に失敗しました。');
      return;
    }

    setSelectedRes(null);
    setEditSelectedGroup(null);
  };

  const handleCreateNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderName.trim()) {
      alert('お客様のお名前を入力してください。');
      return;
    }

    if (checkIsClosed(newOrderDate)) {
      alert('選択された日付は定休日です。');
      return;
    }

    let finalTableId = newOrderTable;
    let finalNotes = '';
    const n = parseInt(newOrderGuests, 10);

    if (n >= 9) {
      if (newOrderFreeTableIds.length === 0) {
        alert('テーブルを1つ以上選択してください。');
        return;
      }
      const occupiedIds = getOccupiedTableIds(newOrderDate, newOrderTime);
      const conflict = newOrderFreeTableIds.find(id => occupiedIds.includes(id));
      if (conflict) {
        alert(`⚠️ テーブル ${conflict} はすでに埋まっています。`);
        return;
      }
      finalTableId = newOrderFreeTableIds[0];
      finalNotes = newOrderFreeTableIds.slice(1).map(id => `_combined:[${id}]`).join(' ');
    } else if (newOrderSelectedGroup) {
      const allGroupIds = [newOrderSelectedGroup.mainTable, ...newOrderSelectedGroup.combinedTables];
      const occupiedIds = getOccupiedTableIds(newOrderDate, newOrderTime);
      const conflict = allGroupIds.find(id => occupiedIds.includes(id));
      if (conflict) {
        alert(`⚠️ テーブル ${conflict} はすでに埋まっています。`);
        return;
      }
      finalTableId = newOrderSelectedGroup.mainTable;
      finalNotes = newOrderSelectedGroup.combinedTables.map(id => `_combined:[${id}]`).join(' ');
    } else {
      const occupiedIds = getOccupiedTableIds(newOrderDate, newOrderTime);
      if (occupiedIds.includes(String(newOrderTable).trim())) {
        alert(`⚠️ テーブル番号 ${newOrderTable} は既に埋まっています。`);
        return;
      }
    }

    try {
      // ─── 追加：データベースに新規予約を送る ───
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: newOrderName,
          date: newOrderDate,
          time: newOrderTime,
          guests: Number(newOrderGuests) || 2,
          table_id: LABEL_TO_DB_ID[finalTableId] ?? finalTableId,
          notes: finalNotes,
        })
      });
      if (!res.ok) throw new Error('API Error');
      const result = await res.json();
      const created = result.reservation;
      const dbId = Number(created.table_id);
      const mappedLabel = DB_ID_TO_LABEL[dbId] || String(created.table_id);

      const newRes = {
        ...created,
        table_id: mappedLabel,
        email: created.email || 'customer@example.com',
        visit_count: created.visit_count ?? 1
      };

      setReservations(prev => [newRes, ...prev]);
    } catch (err) {
      console.error(err);
      alert('予約登録処理に失敗しました。');
      return;
    }

    setShowNewOrderModal(false);
    setNewOrderName('');
    setNewOrderSelectedGroup(null);
    setNewOrderFreeTableIds([]);
  };

  const openNewOrderModal = () => {
    let targetDateStr = selectedDate; 
    if (checkIsClosed(targetDateStr)) {
      let d = new Date(targetDateStr);
      d.setDate(d.getDate() + 2);
      targetDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const defaultTime = '18:00';
    const occupiedIds = getOccupiedTableIds(targetDateStr, defaultTime);
    const firstAvailableTable = sortedTableIds.find(id => !occupiedIds.includes(id)) || '11';

    setNewOrderDate(targetDateStr);
    setNewOrderName('');       
    setNewOrderGuests('0');    
    setNewOrderTime(defaultTime);  
    setNewOrderTable(firstAvailableTable); 
    setCurrentCalendarMonth(new Date(targetDateStr));
    setShowCalendarPopup(false);
    setNewOrderStep('guests'); 
    setNewOrderSelectedGroup(null);
    setNewOrderFreeTableIds([]);
    setShowNewOrderModal(true);
  };

  const handleCalcPress = (num: string) => {
    setNewOrderGuests(prev => {
      if (prev === '0') return num;
      if (prev.length >= 2) return prev;
      return prev + num;
    });
  };

  const handleCalcClear = () => {
    setNewOrderGuests('0');
  };

  const handleCalcConfirm = () => {
    const parsed = parseInt(newOrderGuests, 10);
    if (!parsed || parsed <= 0) {
      alert('1名以上の正確な人数を設定してください。');
      return;
    }
    setNewOrderStep('details'); 
  };

  const checkIsClosed = (dateStr: string) => {
    if (Object.prototype.hasOwnProperty.call(overridesMap, dateStr)) {
      return overridesMap[dateStr];
    }
    const day = new Date(dateStr).getDay();
    return closedWeekDays.includes(day);
  };

  const isSelectedDateClosed = checkIsClosed(selectedDate);

  // 「今日」ボタン: 本日が営業日ならそこへ、休業日なら次の営業日へジャンプ
  const handleGoToToday = () => {
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!checkIsClosed(dateStr)) {
        setSelectedDate(dateStr);
        return;
      }
    }
    setSelectedDate(getTodayString());
  };

  const formatPureDate = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')} (${weekDays[targetDate.getDay()]})`;
  };

  const getDateTopLabel = (dateStr: string) => {
    const todayStr = getTodayString();
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr) return '今日';
    if (dateStr === tomorrowStr) return '明日';
    if (checkIsClosed(dateStr)) return '定休';
    return ''; 
  };

  const weeklyDates = ((centerDateStr: string) => {
    const range = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(centerDateStr);
      d.setDate(d.getDate() + i);
      range.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return range;
  })(selectedDate);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDown.current = true;
    scrollRef.current.classList.add('cursor-grabbing');
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseLeaveOrUp = () => {
    isDown.current = false;
    if (scrollRef.current) scrollRef.current.classList.remove('cursor-grabbing');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const walk = (e.pageX - scrollRef.current.offsetLeft - startX.current) * 1.5; 
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const getCleanNotes = (notesStr: string) => {
    if (!notesStr) return '';
    return notesStr.replace(/_combined:\[.*?\]/g, '').trim();
  };

  const todayConfirmedReservations = reservations.filter(r => r.date === selectedDate && r.status === 'confirmed');
  
  const lunchReservations = todayConfirmedReservations.filter(r => isLunchTime(r.time));
  const totalLunchGuests = lunchReservations.reduce((sum, r) => sum + Number(r.guests || 0), 0);
  const totalLunchCount = lunchReservations.length;

  const dinnerReservations = todayConfirmedReservations.filter(r => !isLunchTime(r.time));
  const totalDinnerGuests = dinnerReservations.reduce((sum, r) => sum + Number(r.guests || 0), 0);
  const totalDinnerCount = dinnerReservations.length;

  const displaySideReservations = (currentShift === 'lunch' ? lunchReservations : dinnerReservations)
    .sort((a, b) => a.time.localeCompare(b.time));

  const filteredReservations = reservations.filter(r => {
    if (activeTab === 'today') return r.date === selectedDate;
    if (activeTab === 'future') return futureListMode === 'past' ? r.date < selectedDate : r.date > selectedDate;
    return true;
  });

  const customerList = (() => {
    const customerMap: { [key: string]: CustomerSummary } = {};
    reservations.forEach((r) => {
      if (!r.guest_name) return;
      const name = r.guest_name.trim();
      if (!customerMap[name]) {
        customerMap[name] = {
          guest_name: name,
          email: r.email || '-',
          phone: r.phone || '-',
          company_name: r.company_name || '',
          notes: getCleanNotes(r.notes || ''),
          total_visits: 0,
          last_visit: r.date,
          latestReservationId: r.id,
        };
      }
      if (r.status === 'confirmed') customerMap[name].total_visits += 1;
      // 最新の予約情報で連絡先・備考を上書きしておく（最新が正とみなす）
      if (r.date >= customerMap[name].last_visit) {
        customerMap[name].last_visit = r.date;
        customerMap[name].email = r.email || customerMap[name].email;
        customerMap[name].phone = r.phone || customerMap[name].phone;
        customerMap[name].company_name = r.company_name || customerMap[name].company_name;
        customerMap[name].notes = getCleanNotes(r.notes || '') || customerMap[name].notes;
        customerMap[name].latestReservationId = r.id;
      }
    });
    return Object.values(customerMap).sort((a, b) => a.guest_name.localeCompare(b.guest_name, 'ja'));
  })();

  const openCustomerEditModal = (c: CustomerSummary) => {
    setEditingCustomer(c);
    setCeName(c.guest_name);
    setCeEmail(c.email === '-' ? '' : c.email);
    setCePhone(c.phone === '-' ? '' : c.phone);
    setCeCompany(c.company_name);
    setCeNotes(c.notes);
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer || !ceName.trim()) return;
    setCeSaving(true);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldName: editingCustomer.guest_name,
          name: ceName.trim(),
          email: ceEmail.trim(),
          phone: cePhone.trim(),
          company_name: ceCompany.trim(),
          notes: ceNotes.trim(),
          latestReservationId: editingCustomer.latestReservationId,
        }),
      });
      if (!res.ok) throw new Error();
      setEditingCustomer(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('顧客情報の更新に失敗しました。');
    } finally {
      setCeSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!editingCustomer) return;
    const typed = window.prompt(
      `本当に削除する場合は、お客様氏名「${editingCustomer.guest_name}」と一致するように入力してください。\nこの方の予約履歴（${editingCustomer.total_visits}件）が完全に削除され、元に戻せません。`
    );
    if (typed === null) return;
    if (typed !== editingCustomer.guest_name) {
      alert('入力が一致しなかったため、削除をキャンセルしました。');
      return;
    }
    setCeSaving(true);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCustomer.guest_name }),
      });
      if (!res.ok) throw new Error();
      setEditingCustomer(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました。');
    } finally {
      setCeSaving(false);
    }
  };

  const filteredCustomerList = customerSearchQuery.trim()
    ? customerList.filter((c) => {
        const q = customerSearchQuery.trim().toLowerCase();
        return (
          c.guest_name.toLowerCase().includes(q) ||
          c.company_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
    : customerList;

  const generateCalendarDays = (currentMonthDate: Date) => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // 月曜始まり
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysArray = Array(firstDayIndex).fill(null);
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      daysArray.push({ day, dateStr, isClosed: checkIsClosed(dateStr) });
    }
    return daysArray;
  };

  const activeNewOrderOccupiedIds = getOccupiedTableIds(newOrderDate, newOrderTime);
  const activeEditOccupiedIds = selectedRes ? getOccupiedTableIds(selectedRes.date, editTime, selectedRes.id) : [];

  const isNightMapMode = currentShift === 'dinner';
  const isSelectedDateLunchAllowed = isLunchDay(selectedDate);

  return (
    <div className="p-2 min-h-screen font-sans transition-colors duration-300 bg-slate-50 text-slate-900">

      {/* ===== PC・タブレット向けレイアウト（sm以上でのみ表示、手動切り替え可） ===== */}
      <div className={desktopVisibilityClass}>
      {/* 👑 トップヘッダーメニュー */}
      <div className="flex justify-between items-center mb-2 border-b pb-2 px-1 border-slate-200">
        <div className="flex space-x-1.5">
          {([
            { key: 'today', label: '配置図・状況' },
            { key: 'future', label: '今後の予約一覧' },
            { key: 'customers', label: '👥 顧客名簿' }
          ] as const).map((tab) => (
            <button
              key={tab.key}
              role="button"
              onClick={() => { setActiveTab(tab.key); if (tab.key === 'future') setFutureListMode('upcoming'); }}
              className={`text-xs font-black px-3 py-1.5 rounded-lg transition-all`}
              style={{ cursor: 'pointer' }}
            >
              <span className={activeTab === tab.key ? 'text-blue-600 font-black' : 'text-slate-500 font-medium'}>
                {tab.label}
              </span>
            </button>
          ))}
          {activeTab === 'future' && (
            <button
              type="button"
              onClick={() => setFutureListMode(m => m === 'past' ? 'upcoming' : 'past')}
              className={`text-xs font-black px-3 py-1.5 rounded-lg transition-all ${futureListMode === 'past' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              style={{ cursor: 'pointer' }}
            >
              {futureListMode === 'past' ? '🚀 今後の予約に戻す' : '🕰️ 過去の予約'}
            </button>
          )}
        </div>
        <div className="flex space-x-1.5">
          <button
            type="button"
            onClick={handleGoToToday}
            className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-black px-4 py-1.5 rounded-xl border border-slate-300 transition shadow-md"
            style={{ cursor: 'pointer' }}
          >
            🏠 今日
          </button>
          <button
            type="button"
            onClick={() => setShowBusinessDaysModal(true)}
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-black px-4 py-1.5 rounded-xl border border-slate-800 transition shadow-md"
            style={{ cursor: 'pointer' }}
          >
            📅 営業日の変更
          </button>
          <button
            type="button"
            onClick={() => setOnlineEditMode(v => !v)}
            className={`text-xs font-black px-4 py-1.5 rounded-xl border transition shadow-md ${
              onlineEditMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-800'
            }`}
            style={{ cursor: 'pointer' }}
          >
            {onlineEditMode ? '✅ 編集を終了' : '🔒 オフライン'}
          </button>
          <button
            type="button"
            onClick={openNewOrderModal}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-1.5 rounded-xl border border-blue-700 transition shadow-md"
            style={{ cursor: 'pointer' }}
          >
            ➕ 新規予約登録
          </button>
          <button
            type="button"
            onClick={toggleForcedView}
            className="bg-white hover:bg-slate-100 text-slate-500 text-xs font-black px-3 py-1.5 rounded-xl border border-slate-300 transition shadow-md"
            style={{ cursor: 'pointer' }}
          >
            📱 モバイル
          </button>
        </div>
      </div>

      {/* 操作ヘッダーバー */}
      <div className="flex items-center space-x-1.5 p-1.5 rounded-xl border shadow-inner w-full mb-3 justify-between bg-slate-200/60 border-slate-300">
        <button 
          onClick={() => changeDate(-1)} 
          className="w-9 h-9 rounded-lg font-bold text-sm shrink-0 shadow-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
          style={{ cursor: 'pointer' }}
        >
          &lt;
        </button>
        <div 
          ref={scrollRef} 
          onMouseDown={handleMouseDown} 
          onMouseLeave={handleMouseLeaveOrUp} 
          onMouseUp={handleMouseLeaveOrUp} 
          onMouseMove={handleMouseMove} 
          className="flex flex-1 justify-around items-center overflow-x-auto mx-1 gap-1.5 scrollbar-none select-none py-0.5 touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {weeklyDates.map((dateStr) => {
            const isCurrentLoopSelected = dateStr === selectedDate;
            const isLoopClosed = checkIsClosed(dateStr);
            const topLabel = getDateTopLabel(dateStr);
            return (
              <button 
                key={dateStr} 
                onClick={() => setSelectedDate(dateStr)} 
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all flex flex-col items-center min-w-[85px] h-10 justify-center ${isCurrentLoopSelected ? isLoopClosed ? 'bg-white text-slate-900 ring-2 ring-slate-300' : 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-955 ring-2 ring-emerald-300' : isLoopClosed ? 'bg-slate-300/40 text-slate-400 opacity-40' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'}`}
                style={{ cursor: 'pointer' }}
              >
                {topLabel ? <span className="text-[9px] tracking-tight font-black leading-none">{topLabel}</span> : <span className="text-[9px] h-3 block"></span>}
                <span className="text-xs font-mono font-bold mt-0.5">{formatPureDate(dateStr)}</span>
              </button>
            );
          })}
        </div>
        <button 
          onClick={() => changeDate(1)} 
          className="w-9 h-9 rounded-lg font-bold text-sm shrink-0 shadow-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
          style={{ cursor: 'pointer' }}
        >
          &gt;
        </button>
        <div className="relative flex items-center justify-center w-9 h-9 shrink-0">
          <button
            type="button"
            onClick={() => { setMainCalendarMonth(new Date(selectedDate + 'T00:00:00')); setShowMainCalendarPopup(!showMainCalendarPopup); }}
            style={{ cursor: 'pointer' }}
            className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold border border-blue-700 shadow-md flex items-center justify-center text-sm"
          >
            📅
          </button>
          {showMainCalendarPopup && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMainCalendarPopup(false)} />
              <div className="absolute right-0 top-11 bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 w-72 text-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                    onClick={() => { const d = new Date(mainCalendarMonth); d.setMonth(d.getMonth() - 1); setMainCalendarMonth(d); }}
                    style={{ cursor: 'pointer' }}
                  >
                    &lt;
                  </button>
                  <span className="font-black text-xs text-amber-400">{mainCalendarMonth.getFullYear()}年 {mainCalendarMonth.getMonth() + 1}月</span>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                    onClick={() => { const d = new Date(mainCalendarMonth); d.setMonth(d.getMonth() + 1); setMainCalendarMonth(d); }}
                    style={{ cursor: 'pointer' }}
                  >
                    &gt;
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] border-b border-slate-800 pb-1 mb-1 text-slate-500">
                  <span>月</span><span className="text-rose-500/80">火</span><span className="text-rose-500/80">水</span><span>木</span><span>金</span><span>土</span><span>日</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays(mainCalendarMonth).map((dayObj, index) => {
                    if (!dayObj) return <div key={`empty-${index}`} />;
                    const isSelected = dayObj.dateStr === selectedDate;
                    return (
                      <button
                        type="button"
                        key={dayObj.dateStr}
                        onClick={() => { setSelectedDate(dayObj.dateStr); setShowMainCalendarPopup(false); }}
                        title={dayObj.isClosed ? '休業日' : '営業日'}
                        className={`h-7 rounded text-[10px] font-bold transition flex items-center justify-center ${
                          isSelected
                            ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-955 font-black'
                            : dayObj.isClosed
                              ? 'bg-slate-900/70 text-slate-600 line-through hover:bg-slate-800/70'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        {dayObj.day}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[9px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700 inline-block" />
                  <span>休業日</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* フロアマップ枠 */}
      {activeTab === 'today' && (
        <div className="mb-3 border p-3 rounded-xl shadow-xl relative overflow-hidden transition-colors duration-300 bg-white border-slate-200">
          {onlineEditMode && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-800 font-bold flex items-center justify-between gap-2">
              <span>🔓🔒 {formatPureDate(selectedDate)} の常連様テーブルをタップしてオンライン/オフライン切替（上の日付ナビで日を変更できます）</span>
              <button type="button" onClick={() => setOnlineEditMode(false)} className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ cursor: 'pointer' }}>
                完了
              </button>
            </div>
          )}
          <div className="relative w-full">
            <div
              ref={mapContainerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className={`w-[96%] aspect-[16/7.8] rounded-xl border relative p-3 overflow-hidden shadow-inner transition-colors duration-300 touch-none ${
                isSelectedDateClosed 
                  ? 'bg-slate-200 border-slate-300 opacity-95 text-slate-400' 
                  : isNightMapMode 
                    ? 'bg-slate-950 border-slate-800 text-slate-100' 
                    : 'bg-slate-100/90 border-slate-200 text-slate-800'
              }`}
            >
              
              {/* 昼夜ボタンと総計（縦並び） */}
              <div className="absolute flex items-stretch gap-1" style={{ top: '2.5%', left: '2%', width: '13%', height: '21%' }}>
                <div className={`flex flex-col gap-0.5 rounded-lg p-0.5 shadow-inner shrink-0 ${isNightMapMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-200 border border-slate-300'}`}>
                  <button
                    type="button"
                    disabled={!isSelectedDateLunchAllowed}
                    onClick={() => setCurrentShift('lunch')}
                    className={`text-[9px] font-black px-2 py-0.5 rounded-md transition-all flex items-center justify-center gap-0.5 ${
                      !isSelectedDateLunchAllowed
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : currentShift === 'lunch'
                          ? 'bg-gradient-to-b from-orange-400 to-orange-500 text-slate-955 shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={{ cursor: isSelectedDateLunchAllowed ? 'pointer' : 'not-allowed' }}
                    title={!isSelectedDateLunchAllowed ? "昼営業は月・木・金のみです" : ""}
                  >
                    <span>☀️ 昼</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentShift('dinner')}
                    className={`text-[9px] font-black px-2 py-0.5 rounded-md transition-all flex items-center justify-center gap-0.5 ${
                      currentShift === 'dinner' ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>🌙 夜</span>
                  </button>
                </div>

                <div className={`flex flex-col justify-center gap-0.5 border rounded-lg p-1 shadow-sm flex-1 ${isNightMapMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300'}`}>
                  <div className="text-center">
                    <span className="text-[7px] text-slate-500 font-bold block leading-none">昼総計</span>
                    <span className={`text-[9px] font-mono font-black leading-tight block ${currentShift === 'lunch' ? 'text-orange-400' : 'text-slate-400'}`}>
                      {totalLunchGuests}名/{totalLunchCount}件
                    </span>
                  </div>
                  <div className={`h-[1px] w-full ${isNightMapMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <div className="text-center">
                    <span className="text-[7px] text-slate-500 font-bold block leading-none">夜総計</span>
                    <span className={`text-[9px] font-mono font-black leading-tight block ${currentShift === 'dinner' ? 'text-indigo-400' : 'text-slate-400'}`}>
                      {totalDinnerGuests}名/{totalDinnerCount}件
                    </span>
                  </div>
                </div>
              </div>

              {/* 左側予約リストエリア */}
              <div className={`absolute border rounded-xl p-2 flex flex-col transition-colors duration-300 ${isNightMapMode ? 'bg-slate-950/40 border-slate-900/60' : 'bg-white/80 border-slate-300/80'}`} style={{ top: '24%', left: '2%', width: '72.5%', height: '74%' }}>
                <div className={`flex items-center text-[10px] font-black border-b pb-1.5 mb-1 px-1 ${isNightMapMode ? 'text-slate-400 border-slate-800' : 'text-slate-600 border-slate-200'}`}>
                  <span className="w-[12%] shrink-0">時間</span>
                  <span className="w-[10%] shrink-0 text-center">人数</span>
                  <span className="w-[32%] shrink-0 px-1 truncate">お名前</span>
                  <span className="w-[18%] shrink-0 text-center">テーブル</span>
                  <span className="flex-1 px-1 text-slate-500">備考</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {displaySideReservations.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic pt-10 text-center">この時間帯に予約はありません</p>
                  ) : (
                    displaySideReservations.map((r) => {
                      const cleanNote = getCleanNotes(r.notes);
                      const isLunch = isLunchTime(r.time);
                      return (
                        <div 
                          key={r.id} 
                          role="button"
                          tabIndex={0}
                          onClick={() => { setSelectedRes(r); setEditTime(formatShortTime(r.time)); setEditGuests(String(r.guests)); setEditTable(String(r.table_id)); setEditSelectedGroup(null); }} 
                          className={`border h-8 px-1 rounded-md flex items-center transition-all text-[11px] font-black ${isNightMapMode ? 'bg-slate-950/40 hover:bg-blue-600/20 border-slate-900/60 hover:border-blue-500/40' : 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-300'}`}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className={`w-[12%] shrink-0 font-mono flex items-center gap-0.5 ${isLunch ? 'text-orange-500' : 'text-indigo-400'}`}>
                            <span>{isLunch ? '☀️' : '🌙'}</span>
                            {formatShortTime(r.time)}
                          </span>
                          <span className={`w-[10%] shrink-0 text-center font-mono ${isNightMapMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{r.guests}名</span>
                          <span className={`w-[32%] shrink-0 px-1 truncate ${isNightMapMode ? 'text-slate-200' : 'text-slate-800'}`}>{r.guest_name}</span>
                          <span className={`w-[18%] shrink-0 text-center font-mono rounded text-[10px] py-0.5 px-0.5 truncate ${isNightMapMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{displayTableIds(r)}</span>
                          <span className={`flex-1 px-1 truncate text-left text-[11px] ${isNightMapMode ? 'text-amber-400/90' : 'text-amber-700'}`}>{cleanNote || ''}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* テーブルレイアウト */}
              {tables.map((t) => {
                const isCounter = t.type === 'counter-1';
                const shapeClass = t.type === 'square-2' || t.type === 'counter-1' ? 'aspect-square' : t.type === 'rect-h-4' ? 'aspect-[2/1.1]' : 'aspect-[1/2.1]';
                const radiusClass = isCounter ? 'rounded-full' : 'rounded-xl';
                const isThisTableDragging = draggingTableId === t.id;
                const isThisTableHovered = hoveredTableId === t.id;

                if (onlineEditMode) {
                  const isSpecial = SPECIAL_TABLES.includes(t.id);
                  if (!isSpecial) {
                    return (
                      <div key={t.id} className={`absolute flex flex-col items-center justify-center border text-center text-xs opacity-25 ${shapeClass} ${radiusClass} ${isNightMapMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'}`} style={{ top: t.top, left: t.left, width: t.width }}>
                        <span className="font-bold text-[10px]">{t.label}</span>
                      </div>
                    );
                  }
                  const isOpen = onlineOpenTablesToday.includes(t.id);
                  const isSaving = onlineTablesSaving === t.id;
                  return (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleTableClick(t)}
                      className={`absolute flex flex-col items-center justify-center border-2 text-center transition-all ${shapeClass} ${radiusClass} ${
                        isOpen
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-700 ring-4 ring-emerald-300'
                          : 'bg-gradient-to-br from-slate-600 to-slate-800 text-slate-200 border-slate-900 ring-2 ring-slate-500'
                      } ${isSaving ? 'opacity-50' : ''}`}
                      style={{ top: t.top, left: t.left, width: t.width, cursor: isSaving ? 'wait' : 'pointer' }}
                    >
                      {!isOpen && <span className="text-sm leading-none">🔒</span>}
                      <span className="font-black text-[10px] mt-0.5">{t.label}</span>
                    </div>
                  );
                }

                if (isSelectedDateClosed) {
                  return <div key={t.id} className={`absolute flex flex-col items-center justify-center bg-slate-200 text-slate-400 border border-slate-300 opacity-30 text-center text-xs ${shapeClass} ${radiusClass}`} style={{ top: t.top, left: t.left, width: t.width }}><span className="font-bold text-[10px]">{t.label}</span></div>;
                }

                const attachedRes = reservations.find(r => {
                  const matchBasic = r.date === selectedDate && r.status === 'confirmed' && (String(r.table_id).trim() === String(t.id).trim() || r.notes?.includes(`_combined:[${t.id}]`));
                  if (!matchBasic) return false;
                  return currentShift === 'lunch' ? isLunchTime(r.time) : !isLunchTime(r.time);
                });

                let tableStyle = isNightMapMode
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100';

                if (t.isOccupied) {
                  if (isThisTableDragging && isCombineMode) {
                    tableStyle = 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-700 ring-4 ring-amber-300 animate-pulse z-50';
                  } else {
                    tableStyle = `bg-gradient-to-br ${getGuestCountColorClasses(attachedRes?.guests)} text-white ring-1`;
                  }
                } else if (isThisTableHovered) {
                  tableStyle = isCombineMode ? 'bg-amber-300 text-slate-955 ring-4 ring-amber-400 scale-105 z-40' : 'bg-blue-500 text-white ring-4 ring-blue-300 scale-105 z-40';
                }

                return (
                  <div
                    key={t.id}
                    id={`table-target-${t.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleTableClick(t)}
                    onPointerDown={(e) => handlePointerDown(e, t)}
                    onPointerCancel={handlePointerCancel}
                    className={`absolute flex flex-col items-center justify-center shadow-lg border text-center touch-none transition-transform duration-75 overflow-hidden leading-none p-0.5 select-none ${shapeClass} ${radiusClass} ${tableStyle}`}
                    style={{
                      top: t.top,
                      left: t.left,
                      width: t.width,
                      cursor: t.isOccupied ? 'grab' : 'pointer',
                      transform: isThisTableDragging ? `translate3d(${dragPosition.x}px, ${dragPosition.y}px, 0)` : undefined,
                      opacity: isThisTableDragging ? 0.85 : undefined,
                      zIndex: isThisTableDragging ? 100 : undefined,
                      WebkitUserSelect: 'none',
                    }}
                  >
                    {t.isOccupied && attachedRes ? (() => {
                      const isCombinedRes = !!attachedRes.notes?.includes('_combined:[');
                      const guestCountForTable = isCombinedRes ? getTableCapacity(t.type) : attachedRes.guests;
                      return (
                        <div className="relative w-full h-full pointer-events-none select-none">
                          <span className="absolute top-0 left-0.5 text-[7px] font-mono font-bold text-white/90 leading-none whitespace-nowrap">
                            {formatShortTime(attachedRes.time)}
                          </span>
                          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-black/30 text-white text-[7px] font-black flex items-center justify-center leading-none">
                            {guestCountForTable}
                          </span>
                          <div className="absolute inset-x-0.5 top-3.5 bottom-0.5 flex items-center justify-center">
                            <span className="text-[8px] font-black text-white text-center leading-tight line-clamp-2 break-words">
                              {attachedRes.guest_name}
                            </span>
                          </div>
                        </div>
                      );
                    })() : (
                      <span className="font-black text-xs tracking-tight pointer-events-none select-none">{t.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>
      {/* ===== ここまでPC・タブレット向け ===== */}

      {/* ======================================================
          営業日の変更モーダル
      ====================================================== */}
      {showBusinessDaysModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-100">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white flex justify-between items-center border-b border-slate-700">
              <h3 className="text-sm font-black tracking-tight">📅 営業日の変更</h3>
              <button
                type="button"
                onClick={() => { setShowBusinessDaysModal(false); setBdPendingEntries([]); setBdShowCalendarPopup(false); setBdShowEndCalendarPopup(false); }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition"
                style={{ cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div ref={bdStartFieldRef}>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">開始日</label>
                  <div className="flex space-x-1">
                    <input
                      type="date"
                      value={bdStartDate}
                      onChange={(e) => e.target.value && handleBdStartDateChange(e.target.value)}
                      onFocus={openBdStartCalendar}
                      className="flex-1 w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => (bdShowCalendarPopup ? setBdShowCalendarPopup(false) : openBdStartCalendar())}
                      className="bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold px-3 rounded-lg border border-slate-700 transition"
                      style={{ cursor: 'pointer' }}
                    >
                      📅
                    </button>
                  </div>
                </div>
                <div ref={bdEndFieldRef}>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">終了日（複数日をまとめる場合のみ変更）</label>
                  <div className="flex space-x-1">
                    <input
                      type="date"
                      value={bdEndDate}
                      onChange={(e) => e.target.value && setBdEndDate(e.target.value)}
                      onFocus={openBdEndCalendar}
                      min={bdStartDate}
                      className="flex-1 w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => (bdShowEndCalendarPopup ? setBdShowEndCalendarPopup(false) : openBdEndCalendar())}
                      className="bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold px-3 rounded-lg border border-slate-700 transition"
                      style={{ cursor: 'pointer' }}
                    >
                      📅
                    </button>
                  </div>
                </div>
              </div>

              {bdShowCalendarPopup && bdCalendarPos && typeof document !== 'undefined' && createPortal(
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setBdShowCalendarPopup(false)} />
                  <div
                    className="fixed bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl z-[61] w-72"
                    style={{ top: bdCalendarPos.top, left: bdCalendarPos.left }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                        onClick={() => { const d = new Date(bdCalendarMonth); d.setMonth(d.getMonth() - 1); setBdCalendarMonth(d); }}
                        style={{ cursor: 'pointer' }}
                      >
                        &lt;
                      </button>
                      <span className="font-black text-xs text-amber-400">{bdCalendarMonth.getFullYear()}年 {bdCalendarMonth.getMonth() + 1}月</span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                        onClick={() => { const d = new Date(bdCalendarMonth); d.setMonth(d.getMonth() + 1); setBdCalendarMonth(d); }}
                        style={{ cursor: 'pointer' }}
                      >
                        &gt;
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] border-b border-slate-800 pb-1 mb-1 text-slate-500">
                      <span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays(bdCalendarMonth).map((dayObj, index) => {
                        if (!dayObj) return <div key={`empty-${index}`} />;
                        const isSelected = dayObj.dateStr === bdStartDate;
                        return (
                          <button
                            type="button"
                            key={dayObj.dateStr}
                            onClick={() => { handleBdStartDateChange(dayObj.dateStr); setBdShowCalendarPopup(false); }}
                            className={`h-7 rounded text-[10px] font-bold transition flex items-center justify-center ${
                              isSelected
                                ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-955 font-black'
                                : dayObj.isClosed
                                  ? 'bg-slate-900/70 text-slate-600 line-through hover:bg-slate-800/70'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                            }`}
                            style={{ cursor: 'pointer' }}
                            title={dayObj.isClosed ? '現在は休業日' : '現在は営業日'}
                          >
                            {dayObj.day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>,
                document.body
              )}

              {bdShowEndCalendarPopup && bdEndCalendarPos && typeof document !== 'undefined' && createPortal(
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setBdShowEndCalendarPopup(false)} />
                  <div
                    className="fixed bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl z-[61] w-72"
                    style={{ top: bdEndCalendarPos.top, left: bdEndCalendarPos.left }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                        onClick={() => { const d = new Date(bdEndCalendarMonth); d.setMonth(d.getMonth() - 1); setBdEndCalendarMonth(d); }}
                        style={{ cursor: 'pointer' }}
                      >
                        &lt;
                      </button>
                      <span className="font-black text-xs text-amber-400">{bdEndCalendarMonth.getFullYear()}年 {bdEndCalendarMonth.getMonth() + 1}月</span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-white px-1 text-xs font-bold"
                        onClick={() => { const d = new Date(bdEndCalendarMonth); d.setMonth(d.getMonth() + 1); setBdEndCalendarMonth(d); }}
                        style={{ cursor: 'pointer' }}
                      >
                        &gt;
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] border-b border-slate-800 pb-1 mb-1 text-slate-500">
                      <span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays(bdEndCalendarMonth).map((dayObj, index) => {
                        if (!dayObj) return <div key={`empty-${index}`} />;
                        const isBeforeStart = dayObj.dateStr < bdStartDate;
                        const isSelected = dayObj.dateStr === bdEndDate;
                        if (isBeforeStart) {
                          return <div key={dayObj.dateStr} className="h-7 rounded flex items-center justify-center text-slate-700 text-[10px] cursor-not-allowed">{dayObj.day}</div>;
                        }
                        return (
                          <button
                            type="button"
                            key={dayObj.dateStr}
                            onClick={() => { setBdEndDate(dayObj.dateStr); setBdShowEndCalendarPopup(false); }}
                            className={`h-7 rounded text-[10px] font-bold transition flex items-center justify-center ${
                              isSelected
                                ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-955 font-black'
                                : dayObj.isClosed
                                  ? 'bg-slate-900/70 text-slate-600 line-through hover:bg-slate-800/70'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                            }`}
                            style={{ cursor: 'pointer' }}
                            title={dayObj.isClosed ? '現在は休業日' : '現在は営業日'}
                          >
                            {dayObj.day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>,
                document.body
              )}

              <div className="flex rounded-lg overflow-hidden border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBdIsClosed(false)}
                  className={`flex-1 py-2 text-xs font-black transition ${!bdIsClosed ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-500'}`}
                  style={{ cursor: 'pointer' }}
                >
                  営業する
                </button>
                <button
                  type="button"
                  onClick={() => setBdIsClosed(true)}
                  className={`flex-1 py-2 text-xs font-black transition ${bdIsClosed ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-500'}`}
                  style={{ cursor: 'pointer' }}
                >
                  休業する
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddBdEntry}
                className="w-full bg-blue-600/20 hover:bg-blue-600 border border-blue-800 text-blue-300 hover:text-white font-bold py-2 rounded-lg transition text-[11px]"
                style={{ cursor: 'pointer' }}
              >
                ＋ この内容を追加
              </button>

              {bdPendingEntries.length > 0 && (
                <div className="space-y-1.5 border-t border-slate-800 pt-3">
                  <p className="text-[10px] text-slate-500 font-bold">保存待ちの変更</p>
                  {bdPendingEntries.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
                      <span className="font-mono text-[11px] text-slate-300">
                        {entry.startDate}{entry.endDate !== entry.startDate ? ` 〜 ${entry.endDate}` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${entry.is_closed ? 'bg-rose-900/60 text-rose-300' : 'bg-emerald-900/60 text-emerald-300'}`}>
                          {entry.is_closed ? '休業' : '営業'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBdEntry(i)}
                          className="text-slate-500 hover:text-rose-400 text-xs"
                          style={{ cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleSaveBdEntries}
                    disabled={bdSaving}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black py-2.5 rounded-xl transition text-xs"
                    style={{ cursor: 'pointer' }}
                  >
                    {bdSaving ? '保存中...' : '保存する'}
                  </button>
                </div>
              )}

              {businessDayOverrides.length > 0 && (
                <div className="space-y-1.5 border-t border-slate-800 pt-3">
                  <p className="text-[10px] text-slate-500 font-bold">設定済みの特別営業日</p>
                  {businessDayOverrides.map((o) => (
                    <div key={o.date} className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-lg px-2.5 py-1.5">
                      <span className="font-mono text-[11px] text-slate-300">{o.date}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${o.is_closed ? 'bg-rose-900/60 text-rose-300' : 'bg-emerald-900/60 text-emerald-300'}`}>
                          {o.is_closed ? '休業' : '営業'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteOverride(o.date)}
                          className="text-[10px] text-slate-500 hover:text-rose-400 font-bold"
                          style={{ cursor: 'pointer' }}
                        >
                          解除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          顧客情報の編集モーダル
      ====================================================== */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-100">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white flex justify-between items-center border-b border-slate-700">
              <div>
                <h3 className="text-sm font-black tracking-tight">👤 顧客情報の編集</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">来店回数: {editingCustomer.total_visits}回 / 最終来店: {editingCustomer.last_visit}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition"
                style={{ cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">お名前</label>
                <input value={ceName} onChange={(e) => setCeName(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">メールアドレス</label>
                <input value={ceEmail} onChange={(e) => setCeEmail(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">電話番号</label>
                <input value={cePhone} onChange={(e) => setCePhone(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">会社名</label>
                <input value={ceCompany} onChange={(e) => setCeCompany(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">備考（直近の予約に反映されます）</label>
                <textarea value={ceNotes} onChange={(e) => setCeNotes(e.target.value)} rows={3} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                お名前・メール・電話番号・会社名はこの方の全ての予約履歴に反映されます。備考のみ直近の予約に反映されます。
              </p>
              <button
                type="button"
                onClick={handleSaveCustomer}
                disabled={ceSaving || !ceName.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black py-2.5 rounded-xl transition text-xs"
                style={{ cursor: 'pointer' }}
              >
                {ceSaving ? '保存中...' : '保存する'}
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={ceSaving}
                className="w-full bg-rose-600/10 hover:bg-rose-600 border border-rose-900 text-rose-400 hover:text-white disabled:opacity-60 font-bold py-2.5 rounded-xl transition text-xs"
                style={{ cursor: 'pointer' }}
              >
                🗑️ この顧客の予約履歴を完全に削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          既存予約編集モーダル
      ====================================================== */}
      {selectedRes && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-100">
          <form onSubmit={handleUpdateReservation} className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white flex justify-between items-center border-b border-slate-700 shrink-0">
              <div>
                <h3 className="text-sm font-black tracking-tight">⚙️ 予約情報の確認・変更</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{selectedRes.date} / {selectedRes.guest_name} 様</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedRes(null); setEditSelectedGroup(null); }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition"
                style={{ cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3.5 text-xs overflow-y-auto overscroll-contain flex-1 min-h-0">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">⏰ 来店予約時刻</label>
                <select value={editTime} onChange={(e) => setEditTime(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-black text-sm cursor-pointer focus:outline-none" style={{ cursor: 'pointer' }}>
                  {availableTimes.map(t => {
                    if (!isLunchDay(selectedRes.date) && isLunchTime(t)) return null;
                    return <option key={t} value={t}>{isLunchTime(t) ? `☀️ 昼 ${t}` : `🌙 夜 ${t}`}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">👤 お客様氏名</label>
                <div className="w-full p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-slate-300 font-black text-sm">{selectedRes.guest_name}</div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">👥 人数</label>
                <select value={editGuests} onChange={(e) => { setEditGuests(e.target.value); setEditSelectedGroup(null); }} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-black text-sm cursor-pointer" style={{ cursor: 'pointer' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={String(n)}>{n} 名</option>)}
                </select>
              </div>

              {/* テーブル選択（グループ対応） */}
              {renderGroupSelector(
                editGuests,
                selectedRes.date,
                editTime,
                editSelectedGroup,
                setEditSelectedGroup,
                editTable,
                setEditTable,
                activeEditOccupiedIds,
                selectedRes.id,
                reservations,
              )}

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">📝 オンラインコメント欄</label>
                <div className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-medium whitespace-pre-wrap leading-relaxed min-h-[60px]">
                  {getCleanNotes(selectedRes.notes) ? getCleanNotes(selectedRes.notes) : <span className="text-slate-600 italic font-normal">コメントはありません</span>}
                </div>
              </div>
            </div>
            <div className="bg-slate-950/60 p-3 px-4 border-t border-slate-800 flex justify-between items-center shrink-0">
              {selectedRes.status === 'confirmed' ? (
                <button 
                  type="button" 
                  onClick={() => handleCancelReservation(selectedRes.id, selectedRes.guest_name)} 
                  className="bg-rose-600/20 hover:bg-rose-600 border border-rose-900 text-rose-400 hover:text-white font-bold px-3 py-2 rounded-lg transition text-[11px]"
                  style={{ cursor: 'pointer' }}
                >
                  🗑️ 予約取消
                </button>
              ) : (
                <span className="text-rose-500 font-bold text-[11px]">⚠️ 取消済み</span>
              )}
              <div className="flex space-x-2">
                <button 
                  type="button" 
                  onClick={() => { setSelectedRes(null); setEditSelectedGroup(null); }} 
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg transition"
                  style={{ cursor: 'pointer' }}
                >
                  閉じる
                </button>
                {selectedRes.status === 'confirmed' && (
                  <button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-lg transition shadow-md"
                    style={{ cursor: 'pointer' }}
                  >
                    変更を保存
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================
          新規予約登録ポップアップモーダル (2ステップ構造)
      ====================================================== */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-slate-100">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
            
            {/* ステップ1：計算機風の人数入力画面 */}
            {newOrderStep === 'guests' && (
              <div>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black tracking-tight">🔢 ステップ1: ご来店人数の入力</h3>
                    <p className="text-[10px] opacity-80 mt-0.5">最初に人数を決定してください</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowNewOrderModal(false)} 
                    className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white font-bold flex items-center justify-center text-xs"
                    style={{ cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="bg-slate-950 rounded-xl p-3 text-right border border-slate-800 shadow-inner">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">来店予定人数</span>
                    <span className="text-3xl font-mono font-black text-emerald-400">{newOrderGuests}</span>
                    <span className="text-sm font-bold text-slate-400 ml-1.5">名</span>
                    {/* 席提案予告バナー */}
                    {parseInt(newOrderGuests, 10) >= 1 && (
                      <div className="text-left bg-amber-950/40 border border-amber-700/50 rounded-lg px-2 py-1.5 mt-2">
                        <span className="text-[10px] text-amber-300 font-bold">🪑 {newOrderGuests}名 → 次のステップでおすすめ席を提案します</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleCalcPress(num)}
                        className="h-14 rounded-xl bg-slate-800 text-xl font-bold font-mono active:bg-slate-700 border border-slate-700/60 shadow-md transition-all flex items-center justify-center text-slate-100"
                        style={{ cursor: 'pointer' }}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleCalcClear}
                      className="h-14 rounded-xl bg-rose-950/40 text-rose-400 font-bold active:bg-rose-900/50 border border-rose-900/40 shadow-md flex items-center justify-center text-xs"
                      style={{ cursor: 'pointer' }}
                    >
                      クリア
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcPress('0')}
                      className="h-14 rounded-xl bg-slate-800 text-xl font-bold font-mono active:bg-slate-700 border border-slate-700/60 shadow-md flex items-center justify-center text-slate-100"
                      style={{ cursor: 'pointer' }}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcConfirm}
                      className="h-14 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-slate-955 font-black active:from-emerald-600 shadow-lg flex items-center justify-center text-xs border border-emerald-400/20"
                      style={{ cursor: 'pointer' }}
                    >
                      確定して次へ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ステップ2：お客様情報や日時の詳細入力 */}
            {newOrderStep === 'details' && (
              <form onSubmit={handleCreateNewOrder}>
                <div className="bg-gradient-to-r from-indigo-600 to-teal-600 p-4 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black tracking-tight">📝 ステップ2: 予約詳細の入力</h3>
                    <p className="text-[10px] opacity-80 mt-0.5">人数: {newOrderGuests} 名 (変更は戻るをクリック)</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setNewOrderStep('guests'); setNewOrderSelectedGroup(null); setNewOrderFreeTableIds([]); }} 
                    className="text-[10px] bg-black/20 hover:bg-black/40 px-2.5 py-1 rounded-md font-bold text-white transition"
                    style={{ cursor: 'pointer' }}
                  >
                    ← 戻る
                  </button>
                </div>
                
                <div className="p-4 space-y-3.5 text-xs overflow-y-auto max-h-[70vh]" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">📅 予約日付</label>
                    <div className="flex space-x-1 relative">
                      <input 
                        type="date" 
                        value={newOrderDate} 
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewOrderDate(e.target.value);
                            setNewOrderSelectedGroup(null);
                            setNewOrderFreeTableIds([]);
                            if (!isLunchDay(e.target.value) && isLunchTime(newOrderTime)) {
                              setNewOrderTime('18:00');
                            }
                          }
                        }} 
                        className="flex-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-bold" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowCalendarPopup(!showCalendarPopup)} 
                        className="bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold px-3 rounded-lg border border-slate-700 transition"
                        style={{ cursor: 'pointer' }}
                      >
                        日暦
                      </button>
                      
                      {showCalendarPopup && (
                        <div className="absolute right-0 top-11 bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl z-50 w-72">
                          <div className="flex justify-between items-center mb-2">
                            <button 
                              type="button" 
                              className="text-slate-400 hover:text-white px-1 text-xs font-bold" 
                              onClick={() => { const d = new Date(currentCalendarMonth); d.setMonth(d.getMonth() - 1); setCurrentCalendarMonth(d); }}
                              style={{ cursor: 'pointer' }}
                            >
                              &lt;
                            </button>
                            <span className="font-black text-xs text-amber-400">{currentCalendarMonth.getFullYear()}年 {currentCalendarMonth.getMonth() + 1}月</span>
                            <button 
                              type="button" 
                              className="text-slate-400 hover:text-white px-1 text-xs font-bold" 
                              onClick={() => { const d = new Date(currentCalendarMonth); d.setMonth(d.getMonth() + 1); setCurrentCalendarMonth(d); }}
                              style={{ cursor: 'pointer' }}
                            >
                              &gt;
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] border-b border-slate-800 pb-1 mb-1 text-slate-500">
                            <span>月</span><span className="text-red-500/80">火</span><span className="text-red-500/80">水</span><span>木</span><span>金</span><span>土</span><span>日</span>
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {generateCalendarDays(currentCalendarMonth).map((dayObj, index) => {
                              if (!dayObj) return <div key={`empty-${index}`} />;
                              if (dayObj.isClosed) return <div key={dayObj.dateStr} title="休業日" className="h-7 rounded flex items-center justify-center bg-slate-900/50 text-slate-700 text-[10px] line-through cursor-not-allowed font-medium">{dayObj.day}</div>;
                              return (
                                <button 
                                  type="button" 
                                  key={dayObj.dateStr} 
                                  onClick={() => { 
                                    setNewOrderDate(dayObj.dateStr); 
                                    setShowCalendarPopup(false);
                                    setNewOrderSelectedGroup(null);
                                    setNewOrderFreeTableIds([]);
                                    if (!isLunchDay(dayObj.dateStr) && isLunchTime(newOrderTime)) {
                                      setNewOrderTime('18:00');
                                    }
                                  }} 
                                  className={`h-7 rounded text-[10px] font-bold transition flex items-center justify-center ${dayObj.dateStr === newOrderDate ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-955 font-black' : 'bg-slate-900 hover:bg-slate-800 text-slate-200'}`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {dayObj.day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 時間選択：昼夜分離グリッド */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">⏰ 来店時刻の選択</label>
                    <div className="grid grid-cols-2 gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div className="space-y-1">
                        <div className="text-center font-black text-[10px] text-orange-400 pb-1 border-b border-slate-800/60 mb-1">☀️ 昼の部</div>
                        {!isLunchDay(newOrderDate) ? (
                          <div className="text-[10px] text-slate-600 italic text-center pt-6">昼の営業なし</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1">
                            {lunchTimes.map(t => {
                              const isSelected = newOrderTime === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => { setNewOrderTime(t); setNewOrderSelectedGroup(null); setNewOrderFreeTableIds([]); }}
                                  className={`py-1.5 rounded-md font-mono text-[11px] font-bold border transition-all ${
                                    isSelected 
                                      ? 'bg-gradient-to-b from-orange-400 to-orange-500 text-slate-955 font-black border-orange-300 shadow-md' 
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 border-l border-slate-800/80 pl-2">
                        <div className="text-center font-black text-[10px] text-indigo-400 pb-1 border-b border-slate-800/60 mb-1">🌙 夜の部</div>
                        <div className="grid grid-cols-2 gap-1">
                          {dinnerTimes.map(t => {
                            const isSelected = newOrderTime === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => { setNewOrderTime(t); setNewOrderSelectedGroup(null); setNewOrderFreeTableIds([]); }}
                                className={`py-1.5 rounded-md font-mono text-[11px] font-bold border transition-all ${
                                  isSelected 
                                    ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white font-black border-indigo-400 shadow-md' 
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                                style={{ cursor: 'pointer' }}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">👤 お客様お名前</label>
                    <input type="text" placeholder="お名前を入力" value={newOrderName} onChange={(e) => setNewOrderName(e.target.value)} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-bold placeholder-slate-600" />
                  </div>

                  {/* テーブル選択（グループ対応） */}
                  {renderGroupSelector(
                    newOrderGuests,
                    newOrderDate,
                    newOrderTime,
                    newOrderSelectedGroup,
                    setNewOrderSelectedGroup,
                    newOrderTable,
                    setNewOrderTable,
                    activeNewOrderOccupiedIds,
                    undefined,
                    reservations,
                    newOrderFreeTableIds,
                    (id: string) => {
                      if (id === '__clear__') { setNewOrderFreeTableIds([]); return; }
                      setNewOrderFreeTableIds(prev =>
                        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                      );
                    },
                  )}
                </div>
                <div className="bg-slate-950/60 p-3 px-4 border-t border-slate-800 flex justify-end space-x-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowNewOrderModal(false); setShowCalendarPopup(false); setNewOrderSelectedGroup(null); setNewOrderFreeTableIds([]); }} 
                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold px-4 py-2 rounded-lg transition text-xs"
                    style={{ cursor: 'pointer' }}
                  >
                    閉じる
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-lg transition shadow-md text-xs"
                    style={{ cursor: 'pointer' }}
                  >
                    登録を確定
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* 下部データ表示エリア（PC・タブレット向け） */}
      <div className={desktopVisibilityClass}>
      {activeTab === 'customers' ? (
        <div className="border p-3 rounded-xl shadow-xl mt-3 bg-white border-slate-200">
          <h2 className="text-xs font-black mb-2 flex items-center justify-between px-1">
            <span>👥 顧客名簿一覧</span>
            <span className="text-[11px] bg-slate-700 px-2 py-0.5 rounded-full text-white">{filteredCustomerList.length} 名</span>
          </h2>
          <input
            type="text"
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            placeholder="🔍 名前・会社名・メールアドレスで検索"
            className="w-full mb-2 p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="overflow-x-auto rounded-xl border bg-white border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                  <th className="p-2.5 font-bold">お客様氏名</th>
                  <th className="p-2.5 font-bold">メールアドレス</th>
                  <th className="p-2.5 font-bold">会社名</th>
                  <th className="p-2.5 font-bold text-center">来店回数</th>
                  <th className="p-2.5 font-bold">最終来店日</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomerList.map((c, idx) => (
                  <tr
                    key={idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => openCustomerEditModal(c)}
                    className="border-b transition border-slate-100 hover:bg-blue-50 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="p-2.5 font-black text-blue-600 underline decoration-blue-200">{c.guest_name}</td>
                    <td className="p-2.5 font-mono text-slate-600 underline decoration-slate-200">{c.email}</td>
                    <td className="p-2.5 text-slate-500">{c.company_name || '-'}</td>
                    <td className="p-2.5 text-center font-black font-mono text-emerald-700">{c.total_visits} 回</td>
                    <td className="p-2.5 font-mono text-amber-600">{c.last_visit}</td>
                  </tr>
                ))}
                {filteredCustomerList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">該当する顧客が見つかりません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border p-3 rounded-xl shadow-xl mt-3 bg-white border-slate-200">
          <h2 className="text-xs font-black mb-2 flex items-center justify-between px-1">
            <span>
              {activeTab === 'today' && '📅 ' + formatPureDate(selectedDate) + ' の使用テーブル一覧'}
              {activeTab === 'future' && (futureListMode === 'past' ? '🕰️ 過去の予約一覧' : '🚀 今後の確定予約一覧')}
              {activeTab === 'all' && '🗄️ すべての予約履歴'}
            </span>
            <span className="text-[11px] bg-slate-700 px-2 py-0.5 rounded-full text-white">{filteredReservations.length} 件</span>
          </h2>
          <div className="overflow-x-auto rounded-xl border bg-white border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                  <th className="p-2.5 font-bold">日時</th>
                  <th className="p-2.5 font-bold">お名前</th>
                  <th className="p-2.5 font-bold">人数</th>
                  <th className="p-2.5 font-bold">使用テーブル番号</th>
                  <th className="p-2.5 font-bold">オンライン備考</th>
                  <th className="p-2.5 font-bold">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.sort((a,b) => a.time.localeCompare(b.time)).map((r) => {
                  const cleanNote = getCleanNotes(r.notes);
                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => { setSelectedRes(r); setEditTime(formatShortTime(r.time)); setEditGuests(String(r.guests)); setEditTable(String(r.table_id)); setEditSelectedGroup(null); }} 
                      className="border-b transition cursor-pointer border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-2.5 font-mono font-black text-amber-600">{r.date} {formatShortTime(r.time)}</td>
                      <td className="p-2.5 font-black text-blue-600">{r.guest_name}</td>
                      <td className="p-2.5 font-black font-mono text-emerald-700">{r.guests} 名</td>
                      <td className="p-2.5"><span className="px-2 py-1 rounded-md text-[11px] font-mono font-black border bg-slate-100 border-slate-300 text-slate-800">{displayTableIds(r)}</span></td>
                      <td className="p-2.5 text-[11px] max-w-xs truncate text-slate-700">{cleanNote || '-'}</td>
                      <td className="p-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${r.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-500'}`}>{r.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* ===== スマホ向けレイアウト（sm未満でのみ表示） ===== */}
      <MobileAdminView
        visibilityClassName={mobileVisibilityClass}
        toggleForcedView={toggleForcedView}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        checkIsClosed={checkIsClosed}
        formatPureDate={formatPureDate}
        getDateTopLabel={getDateTopLabel}
        changeDate={changeDate}
        currentShift={currentShift}
        setCurrentShift={setCurrentShift}
        isSelectedDateLunchAllowed={isSelectedDateLunchAllowed}
        handleGoToToday={handleGoToToday}
        setShowBusinessDaysModal={setShowBusinessDaysModal}
        onlineEditMode={onlineEditMode}
        setOnlineEditMode={setOnlineEditMode}
        onlineOpenTablesToday={onlineOpenTablesToday}
        onlineTablesSaving={onlineTablesSaving}
        toggleOnlineTable={toggleOnlineTable}
        openNewOrderModal={openNewOrderModal}
        mobileTab={mobileTabState}
        setMobileTab={setMobileTab}
        displaySideReservations={displaySideReservations}
        totalLunchGuests={totalLunchGuests}
        totalLunchCount={totalLunchCount}
        totalDinnerGuests={totalDinnerGuests}
        totalDinnerCount={totalDinnerCount}
        isLunchTime={isLunchTime}
        formatShortTime={formatShortTime}
        getCleanNotes={getCleanNotes}
        displayTableIds={displayTableIds}
        tables={tables}
        reservations={reservations}
        isSelectedDateClosed={isSelectedDateClosed}
        setSelectedRes={setSelectedRes}
        setEditTime={setEditTime}
        setEditGuests={setEditGuests}
        setEditTable={setEditTable}
        setEditSelectedGroup={setEditSelectedGroup}
        filteredCustomerList={filteredCustomerList}
        customerSearchQuery={customerSearchQuery}
        setCustomerSearchQuery={setCustomerSearchQuery}
        openCustomerEditModal={openCustomerEditModal}
        filteredReservations={filteredReservations}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}