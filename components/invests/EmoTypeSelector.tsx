type EmoType = 'PRIVATE' | 'SHARED';

type EmoTypeSelectorProps = {
  value: EmoType;
  onChange: (type: EmoType) => void;
};

export default function EmoTypeSelector({
  value,
  onChange,
}: EmoTypeSelectorProps) {
  const base =
    'flex-1 rounded-lg px-4 py-3 text-sm font-medium leading-tight transition-colors';
  const active = 'bg-green text-white';
  const inactive = 'bg-light-gray text-gray-500 active:bg-gray-200';

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-black">エモタイプ</span>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${base} ${value === 'PRIVATE' ? active : inactive}`}
          onClick={() => onChange('PRIVATE')}
        >
          <span className="block">公開エモ</span>
          <span className="block text-xs">（個人）</span>
        </button>
        <button
          type="button"
          className={`${base} ${value === 'SHARED' ? active : inactive}`}
          onClick={() => onChange('SHARED')}
        >
          <span className="block">非公開エモ</span>
          <span className="block text-xs">（グループ共有）</span>
        </button>
      </div>
    </div>
  );
}
