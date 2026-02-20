# emodex

> **Next.js 16 + Mastra** で構築されたフルスタック AI アプリケーション。
> ストリーミングチャット・天気エージェント・グループ管理 API・PWA 通知を統合しています。

---

## 目次

- [技術スタック](#技術スタック)
- [アーキテクチャ](#アーキテクチャ)
- [クイックスタート](#クイックスタート)
- [環境変数](#環境変数)
- [データベース (MySQL + Prisma)](#データベース-mysql--prisma)
- [Mastra AI レイヤー](#mastra-ai-レイヤー)
- [フロントエンド構成](#フロントエンド構成-app-router-3-層)
- [API 一覧](#api-一覧)
- [PWA・通知](#pwa通知)
- [管理者インターフェース](#管理者インターフェース)
- [品質ゲート・CI](#品質ゲートci)
- [npm スクリプト](#npm-スクリプト)

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| 言語 / ランタイム | TypeScript + Node.js >= 22.12.0 |
| フロントエンド | Next.js 16 + React 19 (App Router) |
| AI / エージェント | Mastra (`@mastra/core`, `@mastra/memory`, `@mastra/observability`) |
| データベース | MySQL 8.4 (Docker) + Prisma 7 + `@prisma/adapter-mariadb` |
| 認証 | Auth0 (`@auth0/nextjs-auth0`) |
| スタイリング | Tailwind CSS v4 + PostCSS |
| PWA | `next-pwa` + Service Worker (`/push-sw.js`) |
| バリデーション | Zod v4 |
| テスト | Jest + Testing Library |
| コード品質 | ESLint + Prettier + Husky + lint-staged |

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                        Browser / PWA                    │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼────────────────────────────┐
│                 Next.js 16 (App Router)                  │
│  ┌───────────────┐   ┌──────────────────────────────┐   │
│  │  app/page.tsx │   │     app/api/**  (REST)        │   │
│  │  (thin shell) │   │  /chat/stream  /groups        │   │
│  └──────┬────────┘   │  /health       /v1/albums     │   │
│         │            │  /admin        /cron           │   │
│  ┌──────▼────────┐   └──────────────┬───────────────┘   │
│  │ features/**   │                  │                    │
│  │ components/** │                  │                    │
│  └───────────────┘                  │                    │
└─────────────────────────────────────┼────────────────────┘
                                      │
┌─────────────────────────────────────▼────────────────────┐
│                    Mastra AI Layer                        │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  chatAgent   │  │ weatherAgent  │  │weatherWorkflow│  │
│  │ (Codex model)│  │  (gpt-4o)     │  │               │  │
│  └──────────────┘  └───────┬───────┘  └───────────────┘  │
│                            │                              │
│                    ┌───────▼───────┐                      │
│                    │  weatherTool  │                      │
│                    │ (Open-Meteo)  │                      │
│                    └───────────────┘                      │
└───────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│              MySQL 8.4 (Docker :3307) + Prisma 7          │
│         User  ─── Membership ─── Group                    │
└───────────────────────────────────────────────────────────┘
```

---

## クイックスタート

**前提条件:** Node.js >= 22.12.0、Docker

```bash
# 1. Node バージョン切り替え
nvm use

# 2. 依存パッケージをインストール
npm install

# 3. 環境変数を設定
cp .env.example .env
# .env を開いて必要な値を入力（後述）

# 4. MySQL コンテナを起動
npm run db:up

# 5. Prisma クライアントを生成
npm run db:generate

# 6. マイグレーションを適用
npm run db:migrate

# 7. 開発サーバーを起動
npm run dev
# → http://localhost:3000
```

オプション: モックユーザー 10 件を投入する場合:

```bash
npm run db:seed
```

---

## 環境変数

`.env.example` を `.env` にコピーして値を設定します。

```dotenv
# リリース前ロック（true のままにすると全リクエスト 403 で遮断）
PRE_RELEASE_LOCK=true

# データベース
DATABASE_URL="mysql://emodex:emodex@localhost:3307/emodex"

# Mastra チャット（未設定の場合はモック応答）
OPENAI_API_KEY=""
OPENAI_MODEL="openai/gpt-5-codex"

# Auth0
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=
APP_BASE_URL=http://localhost:3000

# Mastra Cloud オブザーバビリティ（任意）
MASTRA_CLOUD_ACCESS_TOKEN=

# Vercel Cron 認証シークレット
CRON_SECRET=

# 管理者ブートストラップ用メールアドレス（カンマ区切り）
SYSTEM_ADMIN_BOOTSTRAP_EMAILS=
```

---

## データベース (MySQL + Prisma)

### 接続情報

| 項目 | 値 |
|---|---|
| Host | `localhost` |
| Port | `3307`（コンテナ内 `3306`） |
| Database | `emodex` |
| User | `emodex` |
| Password | `emodex` |

### スキーマ

| モデル | 主なフィールド |
|---|---|
| `User` | `id`, `email`（unique）, `name`, `picture?`, timestamps |
| `Group` | `id`, `groupName`, `adminUserId` → User, timestamps |
| `Membership` | `id`, `userId`, `groupId`, `role`（ADMIN\|MEMBER）, unique(`userId`, `groupId`) |

### よく使うコマンド

```bash
npm run db:up            # MySQL コンテナを起動
npm run db:down          # MySQL コンテナを停止
npm run db:logs          # コンテナログを確認

npm run db:generate      # Prisma クライアントを生成
npm run db:migrate       # 保留中のマイグレーションを適用
npm run db:migrate:dev -- --name <name>  # 新しいマイグレーションを作成して適用
npm run db:migrate:reset # DB をリセットして全マイグレーションを再適用
npm run db:migrate:resolve  # ドリフト発生時に適用済みとしてマーク

npm run db:seed          # モックユーザー 10 件を投入
npm run db:studio        # Prisma Studio を起動
```

> **ドリフトが出る場合:** `migrate reset` 後、`_prisma_migrations` の記録がずれることがあります。
> その場合は `npm run db:migrate:resolve` で履歴を合わせてから `npm run db:migrate` を実行してください。

---

## Mastra AI レイヤー

すべての AI コードは `mastra/` に集約されています。

### エージェント

| エージェント | ファイル | モデル | 説明 |
|---|---|---|---|
| `chatAgent` | `mastra/agents/chat-agent.ts` | `OPENAI_MODEL`（デフォルト `openai/gpt-5-codex`）| ストリーミングチャット API で使用。Memory 有効 |
| `weatherAgent` | `mastra/agents/weather-agent.ts` | `openai/gpt-4o` | `weatherWorkflow` 内で使用。`weatherTool` を利用。Memory 有効 |

### ツール

| ツール | ファイル | 説明 |
|---|---|---|
| `weatherTool` (`get-weather`) | `mastra/tools/weather-tool.ts` | Open-Meteo のジオコーディング + 天気予報 API を呼び出す |

### ワークフロー

| ワークフロー | ファイル | ステップ |
|---|---|---|
| `weatherWorkflow` | `mastra/workflows/weather-workflow.ts` | `fetchWeather` → `planActivities`（`weatherAgent` でアクティビティ提案をストリーム）|

### チャットの動作モード

| 状態 | 動作 |
|---|---|
| `OPENAI_API_KEY` **未設定** | ハードコードされたモック応答をストリーム返却（ローカル検証用）|
| `OPENAI_API_KEY` **設定済み** | `OPENAI_MODEL` で指定したモデルで実応答 |

### 新しいエージェントを追加する

1. `mastra/agents/my-agent.ts` を作成し `new Agent({...})` をエクスポート
2. `mastra/index.ts` の `agents: {}` に登録

### 新しいツールを追加する

1. `mastra/tools/my-tool.ts` を作成し `createTool` を使用
2. Zod で `inputSchema` / `outputSchema` を定義
3. 利用するエージェントの `tools` オブジェクトに追加

---

## フロントエンド構成 (App Router 3 層)

```
app/**/page.tsx    ← ルーティング専用シェル（Feature を返すだけ）
     │
features/**        ← 画面単位のルートコンポーネント（状態管理・ユースケース）
     │
components/**      ← 再利用可能な純粋 UI 部品（features からのみ参照）
```

**ルール:**
- `page.tsx` は Feature コンポーネントを import して返すだけ（ロジック禁止）
- `features/` は状態管理・API 呼び出しを担い、`components/` を組み合わせる
- `components/` → `features/` の逆方向 import は禁止

**新規ページを作る場合:**
1. `features/<page>/XxxFeature.tsx` を作成
2. `app/**/page.tsx` で Feature コンポーネントを返す

---

## API 一覧

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/api/chat/stream` | Mastra ストリーミングチャット |
| `GET` | `/api/docs` | Swagger UI |
| `GET` | `/api/health` | ヘルスチェック |
| `GET` | `/api/health/db` | DB ヘルスチェック（200 / 503）|
| `GET/POST/DELETE` | `/api/groups` | グループ CRUD（Auth0 認証）|
| `GET/POST/DELETE` | `/api/groups/:id/memberships` | メンバーシップ管理 |
| `GET` | `/api/users/verify/:email` | メールアドレス存在確認 |
| `POST` | `/api/v1/albums` | アルバム作成 |
| `POST` | `/api/v1/albums/:id/photo-storages` | フォトストレージ保存 |
| `GET` | `/api/v1/albums/:id` | アルバム情報取得 |
| `GET` | `/api/v1/albums/:id/insight` | アルバムインサイト |
| `GET` | `/api/v1/albums/:id/chart` | アルバムチャートデータ |
| `GET` | `/api/v1/albums/:id/dividend` | アルバム配当情報 |
| `GET` | `/api/cron/emo-snapshots` | 日次 Emo スナップショット（Cron 専用）|
| `GET/POST/DELETE` | `/api/admin/system-administrators` | システム管理者管理 |
| `GET` | `/api/admin/overview` | 管理集約データ |

OpenAPI 仕様: `public/doc/api/openapi.yaml`
Swagger UI: http://localhost:3000/api/docs

仕様を更新したら必ず検証してください:

```bash
npm run openapi:validate
```

---

## PWA・通知

`/` 画面に通知テスト UI を実装しています。

| 表示モード | 動作 |
|---|---|
| 通常ブラウザタブ | `Notification` API で Web 通知を表示 |
| PWA（standalone）| Service Worker（`/push-sw.js`）へ `postMessage` して通知を表示 |

判定は `display-mode: standalone` と `navigator.standalone` を使用しています。

> **注意:** 現在はローカル通知の動作検証を目的とした実装です。
> Web Push の配信基盤（VAPID 鍵発行・サーバー送信・購読管理）は未実装です。

---

## 管理者インターフェース

- 画面: `/admin`
- 集約データ API: `GET /api/admin/overview`
- システム管理者 API: `GET/POST/DELETE /api/admin/system-administrators`

`/admin` は `SystemAdministrator` テーブルに登録された `User.id` のみアクセスできます。
初回登録前（`SystemAdministrator` が 0 件）のみ、`.env` の `SYSTEM_ADMIN_BOOTSTRAP_EMAILS` に含まれる email でアクセスし、最初の管理者を追加できます。

---

## Production 事前ロック

本番環境では初回リリース完了まで `PRE_RELEASE_LOCK=true` のままデプロイし、全リクエストを `403` で遮断します（ヘルスチェックのみ通過）。

| 環境 | 動作 |
|---|---|
| `VERCEL_ENV=production` かつ `PRE_RELEASE_LOCK=true` | 全リクエスト 403 |
| `VERCEL_ENV=preview` または `development` | 影響なし |

公開するときは `PRE_RELEASE_LOCK=false` に変更して再デプロイしてください。

---

## 品質ゲート・CI

CI は `develop` ブランチへの PR で自動実行されます (`.github/workflows/ci.yml`):

1. **Lint** — `npm run lint`
2. **Format** — `npm run format:check`
3. **OpenAPI 検証** — `npm run openapi:validate`

PR を出す前にローカルで確認してください:

```bash
npm run lint
npm run format:check
npm run openapi:validate
```

Husky + lint-staged によって `git commit` 時に Prettier が自動実行されます。

---

## npm スクリプト

| スクリプト | 説明 |
|---|---|
| `npm run dev` | Next.js 開発サーバー起動 |
| `npm run build` | 本番ビルド（`prisma generate` を事前実行）|
| `npm run start` | 本番サーバー起動 |
| `npm run test` | Jest テスト実行 |
| `npm run test:watch` | Jest をウォッチモードで実行 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier で自動整形 |
| `npm run format:check` | Prettier のチェックのみ（CI 用）|
| `npm run openapi:validate` | OpenAPI YAML を検証 |
| `npm run db:up` | MySQL コンテナを起動 |
| `npm run db:down` | MySQL コンテナを停止 |
| `npm run db:logs` | MySQL ログをテール |
| `npm run db:generate` | Prisma クライアントを生成 |
| `npm run db:migrate` | 保留マイグレーションを適用 |
| `npm run db:migrate:dev` | マイグレーションを作成して適用（開発用）|
| `npm run db:migrate:reset` | DB リセット + マイグレーション再適用 |
| `npm run db:migrate:resolve` | 初回マイグレーションを適用済みとしてマーク |
| `npm run db:seed` | モックユーザー 10 件を投入 |
| `npm run db:studio` | Prisma Studio を起動 |

---

## ディレクトリ構成

```
emodex/
├── app/                        # Next.js App Router
│   ├── page.tsx                # ホーム（HomeFeature へ委譲）
│   ├── layout.tsx
│   ├── globals.css
│   ├── manifest.ts
│   └── api/                    # REST API Route Handlers
│       ├── chat/stream/        # POST  /api/chat/stream
│       ├── docs/               # GET   /api/docs (Swagger UI)
│       ├── groups/             # Groups & Memberships CRUD
│       ├── cron/emo-snapshots/ # GET   /api/cron/emo-snapshots
│       ├── health/             # GET   /api/health, /api/health/db
│       ├── users/verify/       # GET   /api/users/verify/:email
│       └── v1/albums/          # Albums エンドポイント群
│
├── features/                   # 画面単位のルートコンポーネント
│   ├── home/HomeFeature.tsx
│   └── health/HealthFeature.tsx
│
├── components/                 # 再利用可能な純粋 UI 部品
│   ├── auth/                   # Login / Logout / Profile
│   ├── chat/                   # ChatForm, ChatResponse
│   ├── health/                 # HealthStatus
│   └── notification/           # NotificationTest
│
├── mastra/                     # Mastra AI レイヤー
│   ├── index.ts                # Mastra インスタンス（エージェント・ワークフロー登録）
│   ├── agents/
│   │   ├── chat-agent.ts       # chatAgent（OpenAI Codex, Memory 有効）
│   │   └── weather-agent.ts    # weatherAgent（gpt-4o, weatherTool 使用）
│   ├── tools/
│   │   └── weather-tool.ts     # get-weather（Open-Meteo API）
│   └── workflows/
│       └── weather-workflow.ts # fetchWeather → planActivities
│
├── lib/
│   ├── prisma.ts               # Prisma クライアントシングルトン
│   └── auth0.ts                # Auth0 クライアント + onCallback フック
│
├── prisma/
│   ├── schema.prisma           # User, Group, Membership モデル
│   ├── prisma.config.ts
│   ├── seed.ts
│   └── migrations/
│
├── public/
│   ├── doc/api/openapi.yaml    # OpenAPI 3.1 仕様（正規ソース）
│   └── push-sw.js              # PWA プッシュ通知用 Service Worker
│
├── scripts/
│   └── validate-openapi.mjs
│
├── docker/
│   └── mysql/init/01-grants.sql
│
├── .github/
│   ├── workflows/ci.yml
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example
├── next.config.ts
├── tsconfig.json               # @/* → ./* パスエイリアス
├── eslint.config.mjs
├── jest.config.js
└── package.json
```
