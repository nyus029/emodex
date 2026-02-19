# AGENTS.override.md (Codex)

## 環境構築（最初に読む）

1. Node.js を 22.12 以上に切り替え: `nvm use`
2. 依存関係を取得: `npm install`
3. 環境変数を用意: `cp .env.example .env`（必要なキーを追記）
4. MySQL（Docker）: `npm run db:up` / `npm run db:down` / `npm run db:logs`
   - host `localhost`, port `3307`（container 3306）, user/password `emodex`, DB `emodex`
5. Prisma: 初回 `npm run db:generate`、既存適用 `npm run db:migrate`、seed `npm run db:seed`、Studio `npm run db:studio`
6. 開発・ビルド: `npm run dev`（Mastra Studio localhost:4111）、`npm run build`

## よく使うコマンド（探索・確認）

- ツリー概要（不要ディレクトリ除外）: `find . -maxdepth 3 -type d | sort | rg -v '^\./(node_modules|\\.git|\\.next)(/|$)'`
- 設定/CI 周辺を確認: `find .github .cursor .claude .agents .husky .vscode -maxdepth 4 -type f | sort`
- 主要ファイルを行番号付きで読む例: `nl -ba README.md | sed -n '1,240p'`
- API/画面関連の確認例: `nl -ba app/api/chat/stream/route.ts | sed -n '1,240p'`, `nl -ba features/home/HomeFeature.tsx | sed -n '1,260p'`
- Prisma/設定の確認例: `nl -ba prisma.config.ts | sed -n '1,200p'`, `nl -ba prisma/schema.prisma | sed -n '1,220p'`
  （現状、追加インストールが必要な専用 CLI はなし。必要になれば理由付きで追記。）

## ディレクトリの当たり所

| 配置先             | ここに置く実装                                                 | 既存例                                                                                 | 置かない方がよいもの                  |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| `app/`             | ルーティング入口・Route Handler API                            | `app/page.tsx` が `HomeFeature` を返却、`app/api/chat/stream/route.ts` などの API 実装 | 画面全体の状態管理（`features/`へ）   |
| `features/`        | 画面単位のロジック/状態管理                                    | `features/home/HomeFeature.tsx` に入力状態や stream 処理を集約                         | 再利用 UI の肥大化（`components/`へ） |
| `components/`      | プレゼンテーション中心の再利用 UI                              | `components/chat/ChatForm.tsx` が props ベースで描画・イベント伝搬                     | API 呼び出しや画面全体の状態管理      |
| `mastra/agents`    | Mastra Agent 定義（モデル/プロンプト/メモリ）                  | `mastra/agents/chat-agent.ts`                                                          | Next.js Route Handler 本体            |
| `mastra/workflows` | Mastra Workflow/Step オーケストレーション                      | `mastra/workflows/weather-workflow.ts` が fetch→plan を連結                            | 画面固有の UI ロジック                |
| `mastra/tools`     | Agent が呼ぶ外部ツール                                         | `mastra/tools/weather-tool.ts` が Open-Meteo 呼び出しを抽象化                          | 画面描画処理                          |
| `mastra/`          | Mastra 配線（agent/workflow 登録、store/logger/observability） | `mastra/index.ts` で登録と LibSQLStore/PinoLogger 設定                                 | UI コード                             |
| `lib/`             | 共通インフラ接続ユーティリティ                                 | `lib/prisma.ts` で Prisma Client を singleton 化                                       | 画面固有ロジック                      |
| `prisma/`          | DB スキーマ・migration・seed                                   | `prisma/schema.prisma`、`prisma/migrations/`                                           | API レスポンス整形                    |
| `public/`          | 配信ファイル（OpenAPI, SW, 画像）                              | `public/doc/api/openapi.yaml`、`public/push-sw.js`                                     | サーバー/TS コード                    |
| `scripts/`         | 開発・検証補助                                                 | `scripts/validate-openapi.mjs`（swagger-parser）                                       | 実行時アプリロジック                  |
| `docker/`          | ローカル基盤用マニフェスト類                                   | `docker/mysql/init` を compose が利用                                                  | アプリ本体コード                      |
| `.github/`         | CI/PR テンプレ・自動化                                         | `ci.yml`、`codex-pr-review.yml`、`PULL_REQUEST_TEMPLATE.md`                            | アプリ機能コード                      |

## 技術スタック

| 区分                 | 採用技術                                                            |
| -------------------- | ------------------------------------------------------------------- |
| 言語/ランタイム      | TypeScript + Node.js（Node >= 22.12.0）                             |
| フロントエンド       | Next.js 16 + React 19（App Router）                                 |
| AI/Agent             | Mastra（@mastra/\*, mastra）とエージェント実装（chatAgent など）    |
| DB/ORM               | MySQL + Prisma（Client / migrations / seed）                        |
| インフラ（ローカル） | Docker Compose で MySQL 8.4（3307:3306）                            |
| スタイリング         | Tailwind CSS v4 + PostCSS（@tailwindcss/postcss）                   |
| PWA                  | next-pwa、Service Worker（`public/push-sw.js`）                     |
| API仕様              | OpenAPI YAML + Swagger 検証スクリプト（`npm run openapi:validate`） |
| 品質管理             | ESLint / Prettier / Husky / lint-staged                             |

## PR/作業ガイド

- PR 作成時は `.github/PULL_REQUEST_TEMPLATE.md` を使用。
- 変更を加えたら `npm run lint` と `npm run build` で壊れていないか確認（ドキュメントだけの更新は lint のみで可）。
- 不要に厳しい固定条件（全関数への JSDoc 付与、200ms 以内レスポンス強制など）は課さず、文脈に応じて判断。
- 大きめの変更（目安 200 行超）では、可能なら事前に方針を共有。ただし自律実行が必要な場合はブロックしない範囲で進める。
