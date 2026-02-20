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

  const base = 'rounded-md px-3 py-1.5 text-xs font-medium transition-colors';
  const active = 'bg-black text-white dark:bg-white dark:text-black';
  const inactive =
    'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700';

  return (
    <div className="grid gap-2">
      <span className="text-sm">アルバム</span>
      <div className="flex gap-2">
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

      {mode === 'existing' ? (
        <select
          required
          value={selectedAlbumId}
          onChange={(e) => onSelect(e.target.value)}
          className="rounded border px-3 py-2"
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
        <div className="flex gap-2">
          <input
            value={newAlbumName}
            onChange={(e) => setNewAlbumName(e.target.value)}
            className="flex-1 rounded border px-3 py-2"
            placeholder="アルバム名を入力"
            maxLength={120}
            disabled={isCreating}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !newAlbumName.trim()}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isCreating ? '作成中...' : '作成'}
          </button>
        </div>
      )}
    </div>
  );
}
