import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// ─── 画面のテーブル名からデータベースの数値IDへの変換表 ───
// /api/reservations と同じ変換表をここに集約し、管理画面側のAPIからも再利用する。
export const LABEL_TO_DB_ID: Record<string, number> = {
  '51': 1, '52': 2, '53': 3, '54': 4, '68': 5, '67': 6, '66': 7, '65': 8,
  '1': 9, '2': 10, '3': 11, '4': 12, '23': 13, '70': 14, '22': 15, '21': 16,
  '11': 17, '15': 18, '14': 19, '13': 20, '12': 21,
};

export const DB_ID_TO_LABEL: Record<number, string> = Object.fromEntries(
  Object.entries(LABEL_TO_DB_ID).map(([label, id]) => [id, label])
);

const SESSION_DURATION_MIN = 120; // 管理画面からの操作は2時間で重複判定（お客様用の/api/reservationsは2時間半）

const timeToMinutes = (timeStr: string) => {
  const [h, m] = String(timeStr).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

// notesに埋め込まれた結合テーブルのラベル(_combined:[13]等)をDB数値IDへ変換して集める
export const extractCombinedDbIds = (notes: string | null | undefined): number[] => {
  const matches = notes?.match(/_combined:\[(.*?)\]/g);
  if (!matches) return [];
  return matches
    .map((m) => LABEL_TO_DB_ID[m.replace('_combined:[', '').replace(']', '').trim()])
    .filter((id): id is number => !!id);
};

export type TableConflictResult =
  | { conflict: false }
  | {
      conflict: true;
      conflictingReservation: { id: number | string; guest_name?: string; time: string; table_id: number };
      conflictingTableLabel: string;
    };

/**
 * 指定の日付・時間・テーブル（結合テーブル含む）が、他の確定予約と重複していないか確認する。
 * 顧客用の /api/reservations（新規予約、前後2時間半）とは別に、スタッフ操作用に「前後2時間」で判定する。
 * 管理画面からの予約作成・編集（POST / PUT / PATCH）でも共通で使うためのヘルパー。
 *
 * excludeReservationId: 更新対象の予約自身は衝突チェックから除外する（自分自身とは常に重複するため）。
 */
export async function findTableConflict(params: {
  date: string;
  time: string;
  tableId: number;
  notes?: string | null;
  excludeReservationId?: number | string;
}): Promise<TableConflictResult> {
  const { date, time, tableId, notes, excludeReservationId } = params;

  const { data: sameDayReservations, error } = await supabase
    .from('reservations')
    .select('id, table_id, time, notes, guest_name')
    .eq('date', date)
    .eq('status', 'confirmed');

  if (error) throw error;

  const targetMin = timeToMinutes(time);
  const requestedDbIds = new Set<number>([Number(tableId), ...extractCombinedDbIds(notes)]);

  for (const r of sameDayReservations || []) {
    if (excludeReservationId !== undefined && String(r.id) === String(excludeReservationId)) continue;

    const rMin = timeToMinutes(String(r.time));
    if (Math.abs(rMin - targetMin) >= SESSION_DURATION_MIN) continue;

    const occupiedIds = new Set<number>([Number(r.table_id), ...extractCombinedDbIds(r.notes)]);
    const conflictingId = [...requestedDbIds].find((id) => occupiedIds.has(id));

    if (conflictingId !== undefined) {
      return {
        conflict: true,
        conflictingReservation: r,
        conflictingTableLabel: DB_ID_TO_LABEL[conflictingId] || String(conflictingId),
      };
    }
  }

  return { conflict: false };
}
