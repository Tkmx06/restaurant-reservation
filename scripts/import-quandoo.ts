import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// Supabase クライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface QuandooRecord {
  'Customer Name'?: string;
  'Email'?: string;
  'Phone'?: string;
  'Company'?: string;
  'Reservation Date'?: string;
  'Reservation Time'?: string;
  'Party Size'?: string;
  'Status'?: string;
  'Notes'?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

async function importQuandooData(filePath: string): Promise<ImportResult> {
  try {
    let records: QuandooRecord[] = [];

    // ファイル拡張子で処理方法を判定
    const ext = filePath.toLowerCase().split('.').pop();

    if (ext === 'xls' || ext === 'xlsx') {
      // Excel ファイル読み込み
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRecords = XLSX.utils.sheet_to_json<QuandooRecord>(worksheet);
      records = rawRecords;
    } else if (ext === 'csv') {
      // CSV ファイル読み込み
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      }) as QuandooRecord[];
    } else {
      throw new Error(`⚠️ サポート対象外のファイル形式: ${ext}`);
    }

    console.log(`📋 ${records.length} 件の予約を読み込みました\n`);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // バッチ処理（100件ずつ）
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const mappedBatch = batch.map((record, idx) => {
        try {
          const reservationDate = new Date(record['Reservation Date'] || '');
          const [hours, minutes] = (record['Reservation Time'] || '12:00').split(':');
          
          return {
            guest_name: record['Customer Name'] || '未登録',
            email: record['Email'] || null,
            phone: record['Phone'] || null,
            company_name: record['Company'] || null,
            date: reservationDate.toISOString().split('T')[0],
            time: `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`,
            adults: Math.max(1, Math.floor(Number(record['Party Size']) || 2)),
            children: 0,
            totalGuests: Number(record['Party Size']) || 2,
            table_id: 7, // デフォルトテーブル（移行後に手動調整可能）
            notes: `【Quandoo移行】${record['Notes'] || ''}`,
            status: (record['Status'] || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'booked',
            created_at: new Date().toISOString(),
          };
        } catch (err: any) {
          throw new Error(`行 ${i + idx + 1}: ${err.message}`);
        }
      });

      // フィルタリング：エラーの行を除外
      const validBatch = mappedBatch.filter((item, idx) => {
        if (!item) {
          result.errors.push({ row: i + idx + 1, error: 'データ変換に失敗' });
          result.failed++;
          return false;
        }
        return true;
      });

      if (validBatch.length === 0) continue;

      // Supabase に挿入
      const { error } = await supabase
        .from('reservations')
        .insert(validBatch);

      if (error) {
        console.error(`❌ バッチ ${Math.floor(i / batchSize) + 1} 挿入エラー:`, error);
        result.failed += validBatch.length;
        result.errors.push({
          row: i,
          error: error.message,
        });
      } else {
        result.success += validBatch.length;
        console.log(
          `✅ バッチ ${Math.floor(i / batchSize) + 1}: ${validBatch.length} 件インポート完了`
        );
      }
    }

    return result;
  } catch (err: any) {
    console.error('❌ インポート処理エラー:', err);
    throw err;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メイン実行
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ 使い方: npm run import-quandoo <file-path>');
  console.error('   例: npm run import-quandoo ./quandoo-export.xlsx');
  console.error('   例: npm run import-quandoo ./quandoo-export.csv');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ ファイルが見つかりません: ${filePath}`);
  process.exit(1);
}

importQuandooData(filePath)
  .then((result) => {
    console.log('\n📊 インポート結果:');
    console.log(`✅ 成功: ${result.success} 件`);
    console.log(`❌ 失敗: ${result.failed} 件`);

    if (result.errors.length > 0) {
      console.log('\n⚠️ エラー詳細:');
      result.errors.slice(0, 10).forEach(({ row, error }) => {
        console.log(`  行 ${row}: ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... 他 ${result.errors.length - 10} 件`);
      }
    }

    process.exit(result.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('❌ 致命的エラー:', err);
    process.exit(1);
  });
