import * as fs from 'fs';
import * as path from 'path';
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ArchiveResult {
  exportedRows: number;
  deletedRows: number;
  csvPath: string;
  timestamp: string;
}

async function archiveOldReservations(): Promise<ArchiveResult> {
  try {
    // 13ヶ月前の日付を計算
    const now = new Date();
    const thirteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 13, 1);
    const cutoffDate = thirteenMonthsAgo.toISOString().split('T')[0];

    console.log(`🗂️  ${cutoffDate} 以前のデータをアーカイブします...\n`);

    // ステップ1：13ヶ月以前のデータを取得
    const { data: oldData, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .lt('date', cutoffDate);

    if (fetchError) throw fetchError;

    if (!oldData || oldData.length === 0) {
      console.log('✅ アーカイブ対象のデータはありません');
      return {
        exportedRows: 0,
        deletedRows: 0,
        csvPath: '',
        timestamp: new Date().toISOString(),
      };
    }

    // ステップ2：CSV に変換
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const csvPath = `./archives/reservations-archive-${timestamp}.csv`;

    // ディレクトリ作成
    if (!fs.existsSync('./archives')) {
      fs.mkdirSync('./archives', { recursive: true });
    }

    // CSV ヘッダーとボディを作成
    const headers = [
      'id',
      'guest_name',
      'email',
      'phone',
      'company_name',
      'date',
      'time',
      'adults',
      'children',
      'totalGuests',
      'table_id',
      'notes',
      'status',
      'created_at',
    ];

    const csvContent = [
      headers.join(','),
      ...oldData.map((row) =>
        headers
          .map((field) => {
            const value = row[field as keyof typeof row];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(',')
      ),
    ].join('\n');

    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`✅ CSV エクスポート完了: ${csvPath}`);
    console.log(`   ${oldData.length} 件のデータを保存しました\n`);

    // ステップ3：Supabase から削除
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .lt('date', cutoffDate);

    if (deleteError) throw deleteError;

    console.log(`✅ ${oldData.length} 件の古いデータを削除しました\n`);

    // ステップ4：サマリー表示
    console.log('📊 アーカイブ完了:');
    console.log(`   ✅ エクスポート: ${oldData.length} 件`);
    console.log(`   ✅ 削除: ${oldData.length} 件`);
    console.log(`   📁 保存先: ${csvPath}\n`);

    console.log('📌 次のステップ:');
    console.log('   1. 上記 CSV を Google Drive にアップロードしてください');
    console.log('   2. Google Sheets で確認してください');
    console.log('   3. 定期的に実行するには cron ジョブを設定してください\n');

    return {
      exportedRows: oldData.length,
      deletedRows: oldData.length,
      csvPath,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('❌ アーカイブ処理エラー:', err);
    throw err;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メイン実行
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
archiveOldReservations()
  .then((result) => {
    if (result.exportedRows === 0) {
      console.log('ℹ️  アーカイブは実行されませんでした');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 致命的エラー:', err);
    process.exit(1);
  });
