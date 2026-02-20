---
mode: agent
description: コミット、プッシュ、PR作成、CI失敗時の自動修正を一括実行する（必要に応じて --wait）。
---

# create-pr

`.agents/skills/create-pr/SKILL.md` を参照し、以下を順番に実行してください。

1. 変更ファイルの lint/fix
2. 必要なら計画ファイル採用
3. ブランチ作成
4. コミット
5. プッシュ
6. PR作成（Issue紐付け判断を含む）
7. docsレビュー
8. CI待機と失敗時の自動修正（最大3回）
9. `--wait` 指定時はレビュー待機と自動修正

起動例:

- `PR作成`
- `PR作って`
- `PRお願い`
- `create-pr --issue 123 --wait`
