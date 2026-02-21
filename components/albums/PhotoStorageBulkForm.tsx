import { FormEvent } from 'react';

type PhotoStorageBulkFormProps = {
  albumId: string;
  storageName: string;
  files: File[];
  isSubmitting: boolean;
  onStorageNameChange: (value: string) => void;
  onFilesChange: (files: File[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function PhotoStorageBulkForm({
  albumId,
  storageName,
  files,
  isSubmitting,
  onStorageNameChange,
  onFilesChange,
  onSubmit,
}: PhotoStorageBulkFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="mb-1 text-[13px] font-medium text-gray-900">
        フォトストレージを複数追加
      </h2>
      <p className="mb-3 text-xs text-gray-500">対象アルバムID: {albumId}</p>
      <p className="mb-2 text-xs text-gray-500">
        1回の追加で選択した複数画像が1つの photo_storage になります。
      </p>
      <label className="grid gap-1">
        <span className="text-[13px] text-gray-500">photo_storage 名</span>
        <input
          required
          value={storageName}
          onChange={(event) => onStorageNameChange(event.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          placeholder="2026-02-旅行"
        />
      </label>
      <label className="mt-3 grid gap-1">
        <span className="text-[13px] text-gray-500">
          画像ファイル（複数選択可）
        </span>
        <input
          required
          type="file"
          multiple
          accept="image/*"
          onChange={(event) =>
            onFilesChange(Array.from(event.target.files ?? []))
          }
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
        />
      </label>
      <p className="mt-2 text-xs text-gray-500">選択中: {files.length} 件</p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 w-full rounded-xl bg-green py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? '追加中...' : '一括追加'}
      </button>
    </form>
  );
}
