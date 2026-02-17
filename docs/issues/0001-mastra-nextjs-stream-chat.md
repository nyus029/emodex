# Issue: Mastra を Next.js 上で最小構成で動作させ、チャットを stream 対応にする

## 背景

- 現状のトップページは Next.js の初期テンプレートで、Mastra のチャット導線がない。
- 最優先は DB モデル追加ではなく「Mastra が Next.js 上で最低限動くこと」の担保。

## 目的

- Next.js から Mastra Agent を呼び出せる API を用意する。
- UI からチャット入力を行い、返答をストリーミング表示する。
- `OPENAI_API_KEY` 未設定時でもローカル検証できるよう、モックストリームでフォールバックする。

## 完了条件

- `POST /api/chat/stream` が stream レスポンスを返す。
- 画面から送信したメッセージに対して、段階的にテキストが表示される。
- `OPENAI_API_KEY` 設定時は Codex モデル (`openai/gpt-5-codex`) を利用する。
- DB 変更・新規モデル追加を行わない。

## 実装メモ

- 新規 `chatAgent` を Mastra に登録。
- API route で `chatAgent.stream()` を利用し、`chatAgent.stream()` の `textStream` を返す。
- `OPENAI_API_KEY` が無い場合は `ReadableStream` でモック文章を分割送出する。
