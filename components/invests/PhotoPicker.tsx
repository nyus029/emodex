type PhotoPickerProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
};

export default function PhotoPicker({
  files,
  onFilesChange,
}: PhotoPickerProps) {
  return (
    <div className="grid gap-2">
      <label className="grid gap-1">
        <span className="text-sm">画像ファイル（複数選択可）</span>
        <input
          required
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => onFilesChange(Array.from(e.target.files ?? []))}
          className="rounded border px-3 py-2"
        />
      </label>
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative aspect-square overflow-hidden rounded border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL preview for local files */}
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-600 dark:text-zinc-300">
        選択中: {files.length} 件
      </p>
    </div>
  );
}
