# 求人スキル分析アプリ（job_post）

企業の求人情報を取得・整理し、会社・技術スキル・資格などの採用要件を比較できるWebアプリ。統計ページでは職種・スキル・資格ごとの求人件数と月別推移も可視化する。

公開URL: https://jobpostview.gongonticktack.workers.dev/

## データ

- データソースは Supabase のテーブル `public.jobs` / `public.companies` / `public.skills` / `public.job_skills` / `public.dictionary_terms` / `public.dictionary_categories` / `public.company_parser_configs`
- テーブル作成・RLS・ポリシーは `schema.sql` を Supabase の SQL Editor で実行する
- 接続情報（URL と anon キー）は `supabase-config.json` にある。ブラウザに配信する設定へ service_role キーは入れない
- 設定を読み込めない場合はブラウザ内DB（IndexedDB）で動作する。ブラウザ内DBは端末・ブラウザごとの保存なので、共有DBと混同しない
- 求人は200件ずつ取得し、取得できた分から一覧・集計に反映する。保存した求人全文・HTMLを含む `reference_info` は「詳細を確認」を開いた求人だけ追加取得する

## ローカル開発

```sh
npx wrangler dev
```

表示されたURLを開く。画面とクローラーは HTML / CSS / JavaScript で実装されており、npmのビルドは不要。

## デプロイ

```sh
npx wrangler deploy
```

wrangler で Cloudflare Workers にデプロイされる（`wrangler.jsonc` の `name: jobpostview`）。静的ファイルは `.assetsignore` の許可リストにあるものだけが配信されるため、新しいページやスクリプトを追加したら `.assetsignore` への追加も必要。

## 主な機能

- 企業別の公式求人一覧URLからクロールし、職務内容・必須/歓迎スキル・資格・勤務地などを構造化。
- 求人の検索・絞り込み・編集。
- 統計ページ（`stats.html`）：職種カテゴリ（タイトルをキーワードで16カテゴリに丸める）・スキル・資格それぞれの件数ランキングと月別推移をSVGグラフで表示。資格は「資格指定あり求人」の割合も表示する。
- スキル・資格辞書、企業別パーサー設定の管理（設定画面）。
- Supabase連携とブラウザ内DBへのフォールバック。

## フォルダ構成

| 相対パス | 役割 |
| --- | --- |
| `index.html`、`styles.css` | 画面とデザイン |
| `app.js` | 求人表示・検索・編集・DB連携 |
| `stats.html`、`stats.js` | 統計ページ（件数ランキングと月別推移の集計・描画） |
| `crawler.js` | 求人ページの取得と解析 |
| `company-parsers.js` | 企業別URL・解析ルール |
| `functions/api/proxy.js` | クロール用プロキシ |
| `worker.js` | API振分けと静的ファイル配信 |
| `schema.sql` | Supabaseテーブルとポリシー |
| `supabase-config.json` | DB接続先 |
| `scripts/` | データ監査・整理・復旧などの運用補助 |
| `tests/` | アプリ・プロキシ・ブラウザの確認 |
| `wrangler.jsonc` | Workers設定 |

## クロールと scripts/ の注意点

- ブラウザが Workers の `POST /api/proxy` 経由で求人ページを取得し、企業別ルールと辞書でスキル・資格を整理する。取得対象サイトの利用条件を確認し、取得頻度を調整すること。
- データ整理・全文からの再解析・保存時の重複確認では全文を取得する（通常の一覧表示とは取得範囲が違う）。
- `scripts/` には削除・置換を伴う処理もある。本番確認やデータ整理スクリプトは、対象環境を確認してから使用すること。

## 確認方法

```bash
node --test tests/app.test.mjs tests/proxy.test.mjs
node --check stats.js
```

## トラブル対処

- クロール失敗：Workers経由で起動しているか、対象サイトが応答しているか、企業のURL・パーサー設定を確認する。
- 求人内容が欠ける：サイト構造が変わった可能性がある。元ページと解析結果を照合する。
- 別端末でデータが見えない：ブラウザ内DBで動作していないか確認する。
- Supabaseへの保存失敗：テーブル定義とRLS、Networkのエラーレスポンスを確認する。
