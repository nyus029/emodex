# emodex

Next.js + Mastra プロジェクトです。ローカルで MySQL を Docker 上に立ち上げ、Prisma から接続できます。

## セットアップ

**Node.js**: Prisma 7 は Node **22.12 以上**が必要です。nvm を使う場合:

```bash
nvm use
```

```bash
npm install
cp .env.example .env
```

## MySQL (Docker)

```bash
npm run db:up
```

- Host: `localhost`
- Port: `3307` (コンテナ内は `3306`)
- DB: `emodex`
- User: `emodex`
- Password: `emodex`

停止:

```bash
npm run db:down
```

初期化 SQL（権限付与）を再適用したい場合は、`docker compose down -v` でボリューム削除後に `npm run db:up` を実行します。

ログ確認:

```bash
npm run db:logs
```

## Prisma

初回にクライアント生成:

```bash
npm run db:generate
```

マイグレーション適用（適用済みはスキップされます）:

```bash
npm run db:migrate
```

新しいマイグレーションを作成する場合:

```bash
npm run db:migrate:dev -- --name <migration_name>
```

**`migrate reset` 後に再度ドリフトが出る場合:**  
Prisma 7 + `prisma.config.ts` 利用時、reset 後に `_prisma_migrations` が正しく記録されず同じドリフトが出ることがあります。そのときは「適用済み」として履歴を合わせてください:

```bash
npm run db:migrate:resolve
```

その後、`npm run db:migrate` はそのまま通ります。

User のモックを 10 件投入する seed:

```bash
npm run db:seed
```

Prisma Studio:

```bash
npm run db:studio
```

## 開発起動

```bash
npm run dev
```

## Mastra チャット (最小構成)

DB モデル追加なしで、Next.js 上で Mastra を stream チャットとして動作させる最小実装を入れています。

- 画面: `/`
- API: `POST /api/chat/stream`

### 動作モード

1. `OPENAI_API_KEY` 未設定: モック応答をストリーム返却（ローカル検証用）
2. `OPENAI_API_KEY` 設定: Codex モデル（`OPENAI_MODEL`、デフォルト `openai/gpt-5-codex`）で実応答

```bash
npm run dev
```

必要に応じて `.env` に以下を設定してください。

```bash
OPENAI_API_KEY=<your_key>
OPENAI_MODEL=openai/gpt-5-codex
```

## API ドキュメント

- OpenAPI YAML: `/doc/api/openapi.yaml`
- Swagger UI: `/api/docs`（上記 YAML を読み込み）
- 仕様を更新したら `public/doc/api/openapi.yaml` を編集し、`npm run openapi:validate` で整合性を検証してください。

## 接続確認 API

DB のヘルスチェック:

- `GET /api/health/db`
- 成功時: `200`
- 失敗時: `503`（エラー詳細を返却）

## Production 事前ロック

Vercel の本番環境では初回リリース完了まで `PRE_RELEASE_LOCK=true` のままデプロイし、全リクエストを 403 で遮断します（ヘルスチェックのみ通過）。公開するときは環境変数を `false` に変更して再デプロイしてください。Preview/ローカル (`VERCEL_ENV=preview|development`) では影響しません。

## 通知切り替え（通常Web通知 / PWA通知）

`/` 画面に通知テスト UI を追加しています。

- 通常のブラウザタブ表示: `Notification` API を使って Web 通知を表示
- PWA（standalone）表示: Service Worker（`/push-sw.js`）へ `postMessage` して通知を表示

判定は `display-mode: standalone` と `navigator.standalone` を利用しています。

> 現在はローカル通知の動作検証を目的とした実装です。Web Push の配信基盤（VAPID 鍵発行・サーバー送信・購読管理）は未実装です。
