# Codex Agent Override

This file augments `AGENTS.md` for the Codex agent. Follow these notes first when working in this repo.

## 環境構築 (最初に実施)

1. Node 22.12 以上に切り替え: `nvm use`
2. 依存を取得: `npm install`
3. 環境変数を用意: `cp .env.example .env`
4. DB を起動: `npm run db:up`（MySQL 8.4, host `localhost`, port `3307`, user/pass `emodex`）
5. Prisma を同期: `npm run db:generate` → `npm run db:migrate`（必要なら seed `npm run db:seed`, Studio `npm run db:studio`）
6. 開発サーバー: `npm run dev`（停止は `npm run db:down`, ログは `npm run db:logs`）

## 開発でよく使うコマンド

- 品質チェック: `npm run lint`, `npm run build`, `npm run openapi:validate`
- 構成確認: `find . -maxdepth 3 -type d | sort | rg -v '^\./(node_modules|\\.git|\\.next)($|/)'`
- 設定・テンプレート一覧: `find .github .cursor .claude .agents .husky .vscode -maxdepth 4 -type f | sort`
- 主要ファイルの確認: `nl -ba README.md | sed -n '1,240p'`, `nl -ba .github/PULL_REQUEST_TEMPLATE.md | sed -n '1,260p'`
- 画面/API 主要箇所: `nl -ba app/page.tsx | sed -n '1,120p'`, `nl -ba app/api/chat/stream/route.ts | sed -n '1,240p'`
- Mastra 主要箇所: `nl -ba mastra/index.ts | sed -n '1,220p'`, `nl -ba mastra/agents/chat-agent.ts | sed -n '1,220p'`
- DB/Schema: `nl -ba lib/prisma.ts | sed -n '1,180p'`, `nl -ba prisma/schema.prisma | sed -n '1,220p'`
- 追加ツールは不要（任意で `gh` を使う場合は各自インストール）

## Technology Stack

| 区分                 | 採用技術                                                            |
| -------------------- | ------------------------------------------------------------------- |
| 言語/ランタイム      | TypeScript + Node.js（Node >=22.12.0）                              |
| フロントエンド       | Next.js 16 + React 19（App Router 構成）                            |
| AI/Agent             | Mastra（@mastra/\*, mastra）+ エージェント実装（chatAgent など）    |
| DB/ORM               | MySQL + Prisma（Prisma Client / migrations / seed）                 |
| インフラ（ローカル） | Docker Compose で MySQL 8.4 を起動（3307:3306）                     |
| スタイリング         | Tailwind CSS v4 + PostCSS（@tailwindcss/postcss）                   |
| PWA                  | next-pwa 導入、Service Worker（public/push-sw.js）あり              |
| API仕様              | OpenAPI YAML + Swagger 検証スクリプト。README に /api/docs 記載あり |
| 品質管理             | ESLint / Prettier / Husky / lint-staged                             |

## ディレクトリ指針

| 配置先              | ここに置く実装                                                           | 既存実装の具体例                                                                                                   | 置かない方がよいもの                           |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `app/`              | ルーティング入口（`page.tsx`）、Route Handler API、レイアウト            | `app/page.tsx` は `HomeFeature` を返却。`app/api/chat/stream/route.ts` や `app/api/health/db/route.ts` は API 実装 | 大きい UI 状態管理ロジック（`features/` へ）   |
| `features/`         | 画面単位のユースケース制御・状態管理                                     | `features/home/HomeFeature.tsx` で入力状態、通知分岐、ストリーム処理を集約                                         | 汎用 UI パーツの肥大化（`components/` へ分離） |
| `components/`       | 再利用 UI 部品（表示中心）                                               | `components/chat/ChatForm.tsx` は props を受け取り描画・イベント伝播のみ                                           | API 呼び出しや画面全体の状態管理               |
| `mastra/agents`     | Mastra の Agent 定義（モデル・指示・メモリ）                             | `mastra/agents/chat-agent.ts` で Codex モデルをデフォルト設定                                                      | Next.js Route Handler 本体                     |
| `mastra/workflows`  | Mastra Workflow / Step オーケストレーション                              | `mastra/workflows/weather-workflow.ts` が fetch → plan を構成                                                      | 画面固有 UI ロジック                           |
| `mastra/tools`      | Agent が呼ぶ外部機能ラッパー                                             | `mastra/tools/weather-tool.ts` が Open-Meteo 呼び出しを抽象化                                                      | 画面描画処理                                   |
| `mastra/`（ルート） | Mastra 全体配線（agents / workflows / storage / logger / observability） | `mastra/index.ts` で Agent/Workflow を登録                                                                         | UI コード                                      |
| `lib/`              | アプリ共通インフラ接続ユーティリティ                                     | `lib/prisma.ts` で Prisma Client を singleton 化                                                                   | 画面固有ロジック                               |
| `prisma/`           | DB スキーマ・migration・seed                                             | `prisma/schema.prisma`, `prisma.config.ts`                                                                         | API レスポンス整形ロジック                     |
| `public/`           | 配信する静的ファイル（OpenAPI 原本、SW、画像）                           | `public/doc/api/openapi.yaml`, `public/push-sw.js`                                                                 | TS/サーバーコード                              |
| `scripts/`          | 開発・検証補助スクリプト                                                 | `scripts/validate-openapi.mjs`（swagger-parser で YAML 検証）                                                      | 実行時アプリロジック                           |
| `docker/`           | ローカル実行基盤補助（DB 初期化など）                                    | `docker/mysql/init` を compose がマウント                                                                          | アプリ本体コード                               |
| `.github/`          | CI・PR テンプレート・自動化                                              | `ci.yml`, `codex-pr-review.yml`, `.github/PULL_REQUEST_TEMPLATE.md`                                                | アプリ機能コード                               |

## PR / レビュー運用

- PR 作成時は `.github/PULL_REQUEST_TEMPLATE.md` をそのまま使用し、セクション構成を変えない。
- 変更概要・テスト結果をテンプレート内に記載する（必要に応じてリンクや図を追加）。

## Completion / Definition of Done

- 関連するチェックを実行し、実行コマンドと結果を記録する（少なくとも `npm run lint`。実施不可なら理由を書く）。
- 変更範囲はタスクに必要な最小限にとどめ、触れたドキュメントは同時に更新。
- JSDoc は意図が読み取りづらい箇所に限定し、単純な関数へは不要。
- パフォーマンス指標やレスポンスタイムは根拠がある場合のみ設定（固定 200ms などは不要）。
- Next.js ビルド成果物は `.next/` に生成される想定で、`dist/` を要求しない。
- ステージング/本番デプロイはアクセス可能な環境が提供される場合のみ必須。
- 追加の作業ログ (`logs/yyyy-mm-dd.md` 等) 作成は不要。必要になったら指示に従う。

## Constraints & Style

- 丁寧語の強制や 300 文字制限はなし。必要な情報を簡潔にまとめる。
- 影響範囲が大きい / 200 行超の変更は事前に簡易プランを共有するのが基本だが、自動運用で阻害する場合は PR 説明に方針を明記して進める。
- 既存のコードスタイルに従い、過剰なコメントは避ける。
