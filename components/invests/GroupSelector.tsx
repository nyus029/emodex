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
    <label className="grid gap-1">
      <span className="text-sm">グループ選択</span>
      <select
        required
        value={selectedGroupId ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          onSelect(val ? Number(val) : null);
        }}
        className="rounded border px-3 py-2"
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
