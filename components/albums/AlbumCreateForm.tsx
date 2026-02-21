import { FormEvent } from 'react';

type AlbumCreateFormProps = {
  name: string;
  plannedDividend: string;
  tags: string;
  requiredAtAlbumCreation: boolean;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onPlannedDividendChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onRequiredAtAlbumCreationChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function AlbumCreateForm({
  name,
  plannedDividend,
  tags,
  requiredAtAlbumCreation,
  isSubmitting,
  onNameChange,
  onPlannedDividendChange,
  onTagsChange,
  onRequiredAtAlbumCreationChange,
  onSubmit,
}: AlbumCreateFormProps) {
  return (
    <form onSubmit={onSubmit} className="rounded border p-4">
      <h2 className="mb-3 text-lg font-semibold">アルバム作成</h2>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm">アルバム名</span>
          <input
            required
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="rounded border px-3 py-2"
            placeholder="家族アルバム"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">配当予定日時（任意）</span>
          <input
            type="datetime-local"
            value={plannedDividend}
            onChange={(event) => onPlannedDividendChange(event.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">タグ（カンマ区切り）</span>
          <input
            value={tags}
            onChange={(event) => onTagsChange(event.target.value)}
            className="rounded border px-3 py-2"
            placeholder="家族,旅行,イベント"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requiredAtAlbumCreation}
            onChange={(event) =>
              onRequiredAtAlbumCreationChange(event.target.checked)
            }
          />
          アルバム作成時に必須
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? '作成中...' : 'アルバムを作成'}
      </button>
    </form>
  );
}
