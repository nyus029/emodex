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
npm run prisma:generate
```

初回マイグレーション:

```bash
npm run prisma:migrate -- --name init
```

**`migrate reset` 後に再度ドリフトが出る場合:**  
Prisma 7 + `prisma.config.ts` 利用時、reset 後に `_prisma_migrations` が正しく記録されず同じドリフトが出ることがあります。そのときは「適用済み」として履歴を合わせてください:

```bash
npm run prisma:migrate:resolve
```

その後、`npm run prisma:migrate` はそのまま通ります。

User のモックを 10 件投入する seed:

```bash
npm run prisma:seed
```

Prisma Studio:

```bash
npm run prisma:studio
```

## 開発起動

```bash
npm run dev
```

## 接続確認 API

DB のヘルスチェック:

- `GET /api/health/db`
- 成功時: `200`
- 失敗時: `503`（エラー詳細を返却）
