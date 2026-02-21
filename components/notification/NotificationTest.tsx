type NotificationTestProps = {
  value: string;
  onChange: (value: string) => void;
  onTest: () => void | Promise<void>;
};

export default function NotificationTest({
  value,
  onChange,
  onTest,
}: NotificationTestProps) {
  return (
    <section className="rounded border border-zinc-300 p-4">
      <h2 className="mb-2 font-semibold">
        通知テスト（通常Web / PWA Push切替）
      </h2>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
        通常ブラウザでは Web通知、PWA standalone では Service Worker
        経由の通知を送信します。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-zinc-300 px-3 py-2"
          placeholder="通知本文"
        />
        <button
          type="button"
          onClick={onTest}
          className="w-fit rounded bg-zinc-800 px-4 py-2 text-white"
        >
          通知テスト
        </button>
      </div>
    </section>
  );
}
