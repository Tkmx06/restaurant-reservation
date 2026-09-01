# 📊 データ移行・アーカイブ ガイド

## 概要

このガイドでは、Quandoo から新システムへのデータ移行と、長期的なデータ管理方法について説明します。

---

## 🚀 ステップ1：依存パッケージをインストール

```bash
npm install
```

これにより以下がインストールされます：
- `ts-node`：TypeScript スクリプトを実行するツール
- `csv-parse`：CSV パースライブラリ

---

## 📥 ステップ2：Quandoo からデータをエクスポート

### 手順：
1. Quandoo のダッシュボードにログイン
2. **Reservations** or **Customers** セクションへ
3. **Export** ボタンをクリック
4. **CSV 形式** を選択
5. `quandoo-export.csv` という名前で保存

### 期待される CSV カラム：
```
Customer Name, Email, Phone, Company, Reservation Date, Reservation Time, Party Size, Status, Notes
```

---

## 💾 ステップ3：Quandoo データを Supabase にインポート

```bash
npm run import-quandoo ./quandoo-export.csv
```

### 処理内容：
- ✅ CSV を読み込み
- ✅ バッチ処理（100件ずつ）で Supabase にインポート
- ✅ エラーハンドリング付き
- ✅ 実行結果をコンソール表示

### 出力例：
```
📋 5000 件の予約を読み込みました

✅ バッチ 1: 100 件インポート完了
✅ バッチ 2: 100 件インポート完了
...
✅ バッチ 50: 100 件インポート完了

📊 インポート結果:
✅ 成功: 5000 件
❌ 失敗: 0 件
```

---

## 🗂️ ステップ4：自動アーカイブ設定

### 目的：
- 直近1年分のデータ：**Supabase に保持**（高速アクセス）
- 1年以前のデータ：**CSV にエクスポート** → **Google Drive に保存**

### 手動実行：

```bash
npm run archive-reservations
```

### 処理内容：
1. 13ヶ月以前のデータを抽出
2. CSV ファイルに変換
3. `./archives/reservations-archive-YYYY-MM-DD-HH-mm-ss.csv` に保存
4. Supabase から削除（容量確保）

### 出力例：
```
🗂️  2025-08-01 以前のデータをアーカイブします...

✅ CSV エクスポート完了: ./archives/reservations-archive-2026-09-01-10-30-45.csv
   3500 件のデータを保存しました

✅ 3500 件の古いデータを削除しました

📊 アーカイブ完了:
   ✅ エクスポート: 3500 件
   ✅ 削除: 3500 件
   📁 保存先: ./archives/reservations-archive-2026-09-01-10-30-45.csv

📌 次のステップ:
   1. 上記 CSV を Google Drive にアップロードしてください
   2. Google Sheets で確認してください
   3. 定期的に実行するには cron ジョブを設定してください
```

---

## ⏰ ステップ5：定期的なアーカイブ（Vercel Cron）

### 設定方法：

[vercel.json](../vercel.json) に以下を追加：

```json
{
  "crons": [
    {
      "path": "/api/cron/qa-check",
      "schedule": "0 8 * * 2,5"
    },
    {
      "path": "/api/cron/archive-old-data",
      "schedule": "0 1 1 * *"
    }
  ]
}
```

**スケジュール解説：**
- `0 1 1 * *` = **毎月1日 午前1時** にアーカイブ実行

### API エンドポイント：

`/api/cron/archive-old-data` を作成（実装予定）

---

## 📊 データ保持ポリシー

| 期間 | 保存場所 | 用途 | アクセス速度 |
|------|---------|------|-----------|
| 直近1年 | Supabase | 管理画面表示 | ⚡ 高速 |
| 1年以上前 | Google Drive (CSV) | 監査・分析 | 🐢 低速（手動復元） |

---

## 🔍 FAQ

### Q: インポート中にエラーが発生した場合は？

**A:**
```bash
# 最初から再度実行
npm run import-quandoo ./quandoo-export.csv
```

エラーログを確認し、問題のある行を CSV から削除してから再実行してください。

### Q: Google Drive に CSV をアップロードする方法は？

**A:**
1. Google Drive にアクセス
2. `+ 新規` → `ファイルをアップロード`
3. `./archives/` フォルダから CSV を選択
4. 自動で Google Sheets に変換可能

### Q: 過去のアーカイブデータを復元したい場合は？

**A:**
1. Google Drive から CSV をダウンロード
2. 以下を実行：

```bash
npm run import-quandoo ./downloaded-archive.csv
```

### Q: Supabase の容量確認方法は？

**A:**
Supabase ダッシュボード → **Database** → **Storage** タブで確認可能

---

## 🎯 ベストプラクティス

✅ **推奨**
- 月1回、アーカイブを実行
- Google Drive に定期的にバックアップ
- 3ヶ月ごとにバックアップをダウンロード＆オフライン保存

❌ **非推奨**
- アーカイブなしで無制限にデータ増加
- 古いデータを削除せずに残す
- CSV バックアップを取らずにデータ削除

---

## 📞 サポート

質問や問題があれば、[管理者に連絡してください]。
