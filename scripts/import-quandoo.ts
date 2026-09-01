import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// .env.local ファイルからEnvironment変数をロード
const dotenvPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  const env = fs.readFileSync(dotenvPath, 'utf-8');
  env.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

// Supabase クライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface QuandooCustomer {
  'Reservierungsnr.'?: string;
  'Vorname'?: string;
  'Nachname'?: string;
  'E-Mail'?: string;
  'Telefonnummer'?: string;
  'Handy'?: string;
  'Telefon 2'?: string;
  'Anmerkungen'?: string;
  'Adresse'?: string;
  'Geburtstag'?: string;
  [key: string]: any;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  customersImported: number;
  reservationsCreated: number;
}

async function importQuandooData(filePath: string): Promise<ImportResult> {
  try {
    let records: QuandooCustomer[] = [];

    // ファイル拡張子で処理方法を判定
    const ext = filePath.toLowerCase().split('.').pop();

    if (ext === 'xls' || ext === 'xlsx') {
      // Excel ファイル読み込み（動的インポート）
      const xlsxModule = await import('xlsx');
      const XLSX = (xlsxModule as any).default || xlsxModule;
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRecords = XLSX.utils.sheet_to_json(worksheet) as QuandooCustomer[];
      records = rawRecords;
    } else if (ext === 'csv') {
      // CSV ファイル読み込み
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      }) as QuandooCustomer[];
    } else {
      throw new Error(`⚠️ サポート対象外のファイル形式: ${ext}`);
    }

    console.log(`📋 ${records.length} 件の顧客データを読み込みました\n`);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      customersImported: 0,
      reservationsCreated: 0,
    };

    // バッチ処理（100件ずつ）
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // 顧客データをマッピング
      const mappedBatch = batch
        .map((record, idx) => {
          try {
            const firstName = (record['Vorname'] || '').trim();
            const lastName = (record['Nachname'] || '').trim();
            const fullName = `${firstName} ${lastName}`.trim();
            const email = (record['E-Mail'] || '').trim().toLowerCase();
            const phone = (record['Telefonnummer'] || record['Handy'] || record['Telefon 2'] || '').trim();

            // 無効なレコードをフィルタリング
            if (!fullName && !email && !phone) {
              result.errors.push({ row: i + idx + 1, error: '名前、メール、電話がすべて空' });
              result.failed++;
              return null;
            }

            return {
              guest_name: fullName || '未登録',
              email: email || null,
              phone: phone || null,
              notes: `【Quandoo移行】${record['Anmerkungen'] || ''}`,
              created_at: new Date().toISOString(),
              status: 'active',
            };
          } catch (err: any) {
            result.errors.push({ row: i + idx + 1, error: err.message });
            result.failed++;
            return null;
          }
        })
        .filter((item) => item !== null);

      if (mappedBatch.length === 0) continue;

      // Supabase の customers テーブルに挿入
      // （既存テーブルがない場合は予約テーブルに顧客情報として保存）
      const { error } = await supabase
        .from('reservations')
        .insert(
          mappedBatch.map(customer => ({
            guest_name: customer.guest_name,
            email: customer.email || 'customer@example.com',
            phone: customer.phone || '-',
            notes: customer.notes,
            date: new Date().toISOString().split('T')[0], // 今日の日付
            time: '18:00', // デフォルト時間
            guests: 1,
            table_id: 7,
            status: 'inquiry', // 顧客インポートとして記録
            visit_count: 1,
            created_at: customer.created_at,
          }))
        );

      if (error) {
        console.error(`❌ バッチ ${Math.floor(i / batchSize) + 1} 挿入エラー:`, error);
        result.failed += mappedBatch.length;
        result.errors.push({
          row: i,
          error: error.message,
        });
      } else {
        result.success += mappedBatch.length;
        result.customersImported += mappedBatch.length;
        console.log(
          `✅ バッチ ${Math.floor(i / batchSize) + 1}: ${mappedBatch.length} 件のインポート完了`
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
    console.log(`👥 顧客インポート: ${result.customersImported} 件`);

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
