---
name: create-pr
description: コミット、プッシュ、PR作成、CI失敗時の自動修正を一括実行する。`--wait` でレビュー指摘の自動修正まで行う。ユーザーの「PR作成」「PR作って」「PRお願い」で起動する。
allowed-tools: Bash(git checkout --branch:*), Bash(git add:*), Bash(git status:*), Bash(git checkout:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*), Bash(gh issue comment:*), Bash(gh issue view:*), Bash(gh pr comment:*), Bash(git diff:*), Bash(pnpm prettier --config prettier.config.mjs --write:*), Bash(pnpm eslint:*), Bash(gh pr checks:*), Bash(gh pr view:*), Bash(gh api:*), Bash(sleep:*), Bash(for:*), Bash(gh run view:*), Bash(gh run list:*), Read, Edit
argument-hint: --issue <番号>（Issue紐付け）, --wait（レビュー待機・自動修正を有効化）
---

# PR作成スキル

ステージング済み・未ステージングの変更からコミット、プッシュ、PR作成までを一括実行する。

## 用語

| 用語         | 意味                                                             |
| ------------ | ---------------------------------------------------------------- |
| 計画ファイル | `tmp/plans/` にある実装計画                                      |
| 総評         | レビュー全体の結論（`## ⛔️`, `## ⚠️`, `## ✅` で始まるコメント） |
| 個別指摘     | ファイル単位の修正指示（`【ファイル】` 形式のコメント）          |

## ワークフロー

1. Step 1-7: Lint → 計画ファイル → ブランチ → コミット → プッシュ → PR作成 → Issue連携
2. Step 8: docsレビュー
3. Step 9: CI待機。失敗時は自動修正ループ（最大3回）
4. `--wait` 指定時のみ Step 10-11: レビュー待機と自動修正ループ

各Step完了時は必ず `[Step N] <結果の要約>` 形式で報告する。

## 手順

### Step 1: Lint

- 変更ファイルのうち `.tsx`, `.js`, `.jsx` を対象に実行する。
- 複数ファイルは並列で実行する。

```bash
pnpm eslint apps/web/src/handler.ts --fix
```

完了条件: すべての対象ファイルで exit code 0。失敗時は中断。

### Step 2: 計画ファイル処理（任意）

`tmp/plans/<file>` を確認し、後から参照価値がある内容だけ `.claude/plans/` にコピーして `git add` する。単純メモは追加しない。

### Step 3: ブランチ作成

- 現在が `develop` の場合は新規ブランチを作成。
- 既存 feature ブランチならスキップ。
- `--issue` 指定時は `gh issue view` でタイトル/ラベルを取得しブランチ名を生成。

ラベルによるプレフィックス:

- `bug` → `fix/`
- `enhancement` → `feat/`
- `docs` → `docs/`
- 上記以外 → `chore/`

### Step 4: コミット

```bash
git add <変更ファイル群>
git commit -m "<type>: <具体的な変更内容（日本語）>"
```

### Step 5: プッシュ

```bash
git push -u origin <ブランチ名>
```

`--force` / `--force-with-lease` は禁止。

### Step 6: PR作成

1. `templates/pr-body.md` を読み込む。
2. 変更内容に基づいて本文を作る。
3. `gh pr create --base develop --title "<タイトル>" --body "<本文>"` を実行。
4. PR URL を報告。

Issue番号が確定している場合:

- IssueタイトルをPRタイトルに利用（70文字超なら短縮）
- 完了可能なら `Closes #<issue>`、未完了なら `Refs #<issue>` を本文に記載

### Step 7: Issue連携

Issueがある場合は `gh issue comment` でPRリンクを通知する。

### Step 8: docsレビュー

`reviewing-docs` は、このPRで変更されたドキュメントについて、内容の網羅性や記述の明瞭さ、フォーマット崩れ、リンク切れなどを自動チェックするスキルであり、その検出結果（指摘件数）をもとに次のように振る舞う。
`reviewing-docs` の結果を判定する:

- 0件: `[Step 8] ドキュメントレビュー: 問題なし`
- 問題あり + `--wait`: 自動修正してコミット/プッシュ
- 問題あり + `--wait` なし: 結果保持して最終出力で表示

### Step 9: CI待機・CI自動修正

```bash
gh pr checks <PR番号> --watch --fail-fast --interval 15
```

- 最大30分待機。
- 失敗時は失敗workflowのログを取得して修正、再コミット/再プッシュ。
- prettier / eslint / TypeScript / test を優先的に自動修正。
- Chromaticのみ失敗は手動対応として継続。
- 自動修正は最大3回。超えたら手動対応案内で終了。

### Step 10: レビュー待機（`--wait` 指定時のみ）

`gh pr view` / `gh api` で最新レビューを監視し、総評と個別指摘を抽出する。

### Step 11: レビュー自動修正（`--wait` 指定時のみ）

- 指摘を反映し、コミット・プッシュ・再待機を繰り返す。
- 3回失敗したら終了して手動対応を案内する。

## エラーハンドリング

- pre-commit hook失敗: 修正後に新しいコミットを作成（`--amend` 禁止）
- non-fast-forward push: `git pull --rebase origin develop` を案内
- CIログ取得失敗: 手動対応を案内して終了

## 参照

- `templates/pr-body.md`
- `reviewing-docs` スキル
