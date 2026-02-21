import type { GroupItem } from '@/types/api';

type GroupSelectorProps = {
  groups: GroupItem[];
  selectedGroupId: number | null;
  onSelect: (groupId: number | null) => void;
};

export default function GroupSelector({
  groups,
  selectedGroupId,
  onSelect,
}: GroupSelectorProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-gray-600">グループ選択</span>
      <select
        required
        value={selectedGroupId ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          onSelect(val ? Number(val) : null);
        }}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
      >
        <option value="">-- グループを選択 --</option>
        {groups.map((g) => (
          <option key={g.groupId} value={g.groupId}>
            {g.groupName}
          </option>
        ))}
      </select>
    </label>
  );
}
