---
description: コミット、プッシュ、PR作成、CI失敗時の自動修正を一括実行する。--wait でレビュー自動修正まで行う。
allowed-tools: Bash(git checkout --branch:*), Bash(git add:*), Bash(git status:*), Bash(git checkout:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*), Bash(gh issue comment:*), Bash(gh issue view:*), Bash(gh pr comment:*), Bash(git diff:*), Bash(pnpm prettier --config prettier.config.mjs --write:*), Bash(pnpm eslint:*), Bash(gh pr checks:*), Bash(gh pr view:*), Bash(gh api:*), Bash(sleep:*), Bash(for:*), Bash(gh run view:*), Bash(gh run list:*), Read, Edit
argument-hint: --issue <番号> --wait
---

`.agents/skills/create-pr/SKILL.md` の手順に従って PR 作成を実行してください。

引数:

- `--issue <番号>`: Issue紐付け
- `--wait`: レビュー待機と自動修正を有効化
