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
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-gray-600">
          画像ファイル（複数選択可）
        </span>
        <input
          required
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => onFilesChange(Array.from(e.target.files ?? []))}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
        />
      </label>
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative aspect-square overflow-hidden rounded-xl"
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
      <p className="text-xs text-gray-500">選択中: {files.length} 件</p>
    </div>
  );
}
