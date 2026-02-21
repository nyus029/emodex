import { useState, type FormEvent } from 'react';
import type { AlbumListItem } from '@/lib/albums';

type AlbumSelectorProps = {
  albums: AlbumListItem[];
  selectedAlbumId: string;
  isCreating: boolean;
  onSelect: (albumId: string) => void;
  onCreate: (name: string) => Promise<void>;
};

export default function AlbumSelector({
  albums,
  selectedAlbumId,
  isCreating,
  onSelect,
  onCreate,
}: AlbumSelectorProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [newAlbumName, setNewAlbumName] = useState('');

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    await onCreate(newAlbumName.trim());
    setNewAlbumName('');
    setMode('existing');
  };

  const base =
    'h-[42px] w-full min-w-0 rounded-md px-2 text-center text-sm font-medium leading-tight transition-colors sm:px-3 sm:text-sm flex items-center justify-center';
  const active = 'bg-green text-white';
  const inactive = 'bg-light-gray text-gray-500 active:bg-gray-200';

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-black">アルバム</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`${base} ${mode === 'existing' ? active : inactive}`}
          onClick={() => setMode('existing')}
        >
          既存アルバムを選択
        </button>
        <button
          type="button"
          className={`${base} ${mode === 'new' ? active : inactive}`}
          onClick={() => setMode('new')}
        >
          新しく作成する
        </button>
      </div>

      <div className="border-t border-light-gray pt-2">
        {mode === 'existing' ? (
          <select
            required
            value={selectedAlbumId}
            onChange={(e) => onSelect(e.target.value)}
            className="h-[42px] w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900"
          >
            <option value="">-- 選択してください --</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}
                {album.groupName ? ` [${album.groupName}]` : ''} (
                {album.photoStorageCount}件)
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              className="h-[42px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900"
              placeholder="アルバム名を入力"
              maxLength={120}
              disabled={isCreating}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || !newAlbumName.trim()}
              className="h-[42px] rounded-xl bg-green px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {isCreating ? '作成中...' : '作成'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
