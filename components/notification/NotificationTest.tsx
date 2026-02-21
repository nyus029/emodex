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
    <section>
      <h2 className="mb-1 text-[13px] font-medium text-gray-900">通知テスト</h2>
      <p className="mb-3 text-[13px] text-gray-500">
        通常ブラウザでは Web通知、PWA standalone では Service Worker
        経由の通知を送信します。
      </p>
      <div className="flex flex-col gap-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          placeholder="通知本文"
        />
        <button
          type="button"
          onClick={onTest}
          className="w-fit rounded-lg bg-green px-4 py-2 text-sm font-medium text-white"
        >
          通知テスト
        </button>
      </div>
    </section>
  );
}
