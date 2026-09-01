import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
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

async function importQuandooCSV(filePath: string): Promise<ImportResult> {
  try {
    // CSV ファイル読み込み
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as QuandooRecord[];

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
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('❌ 使い方: npm run import-quandoo <csv-file-path>');
  console.error('   例: npm run import-quandoo ./quandoo-export.csv');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`❌ ファイルが見つかりません: ${csvPath}`);
  process.exit(1);
}

importQuandooCSV(csvPath)
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
