import type { AlbumResponse } from '@/lib/albums';

type AlbumDetailPanelProps = {
  album: AlbumResponse | null;
};

export default function AlbumDetailPanel({ album }: AlbumDetailPanelProps) {
  if (!album) {
    return (
      <section>
        <h2 className="text-[13px] font-medium text-gray-900">アルバム詳細</h2>
        <p className="mt-2 text-[13px] text-gray-500">
          まだアルバムがありません。
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-[13px] font-medium text-gray-900">アルバム詳細</h2>
      <div className="mt-3 space-y-2 text-[13px]">
        <div className="flex justify-between">
          <span className="text-gray-500">名前</span>
          <span className="text-gray-800">
            {album.albumBasicInfo.albumName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">ルートパス</span>
          <span className="text-gray-800">{album.albumBasicInfo.rootPath}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">ID</span>
          <span className="text-gray-800">{album.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">ストレージ数</span>
          <span className="text-gray-800">
            {album.photoStorageSummary.totalStorages}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">写真数</span>
          <span className="text-gray-800">
            {album.photoStorageSummary.totalPhotos}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">総容量</span>
          <span className="text-gray-800">
            {album.photoStorageSummary.totalSizeBytes} bytes
          </span>
        </div>
      </div>

      <ul className="mt-4 grid gap-2">
        {album.photoStorages.map((photoStorage) => (
          <li key={photoStorage.id} className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-[13px] font-medium text-gray-900">
              {photoStorage.name}
            </div>
            <div className="text-xs text-gray-500">
              {photoStorage.photoCount}枚 / {photoStorage.totalSizeBytes} bytes
            </div>
            <div className="text-xs text-gray-500">
              {photoStorage.storagePath}
            </div>
            <ul className="mt-2 grid gap-1">
              {photoStorage.photos.map((photo) => (
                <li key={photo.id} className="text-xs">
                  <a
                    href={photo.blobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green underline"
                  >
                    {photo.fileName}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
