type PhotoStorage = {
  id: string;
  name: string;
  storagePath: string;
  photoCount: number;
  totalSizeBytes: number;
  createdAt: string;
  photos: Array<{
    id: string;
    fileName: string;
    blobPath: string;
    blobUrl: string;
    contentType: string | null;
    sizeBytes: number;
  }>;
};

type AlbumResponse = {
  id: string;
  albumBasicInfo: {
    albumName: string;
    rootPath: string;
    createdAt: string;
    plannedDividend: string | null;
    createdTags: string[];
    requiredAtAlbumCreation: boolean;
  };
  photoStorageSummary: {
    totalStorages: number;
    totalPhotos: number;
    totalSizeBytes: number;
    lastAddedAt: string | null;
  };
  photoStorages: PhotoStorage[];
};

type AlbumDetailPanelProps = {
  album: AlbumResponse | null;
};

export default function AlbumDetailPanel({ album }: AlbumDetailPanelProps) {
  if (!album) {
    return (
      <section className="rounded border p-4">
        <h2 className="text-lg font-semibold">アルバム詳細</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          まだアルバムがありません。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border p-4">
      <h2 className="text-lg font-semibold">アルバム詳細</h2>
      <dl className="mt-3 grid gap-1 text-sm">
        <div>名前: {album.albumBasicInfo.albumName}</div>
        <div>ルートパス: {album.albumBasicInfo.rootPath}</div>
        <div>ID: {album.id}</div>
        <div>ストレージ数: {album.photoStorageSummary.totalStorages}</div>
        <div>写真数: {album.photoStorageSummary.totalPhotos}</div>
        <div>総容量(bytes): {album.photoStorageSummary.totalSizeBytes}</div>
      </dl>

      <ul className="mt-4 grid gap-2">
        {album.photoStorages.map((photoStorage) => (
          <li key={photoStorage.id} className="rounded border p-2 text-sm">
            <div>{photoStorage.name}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300">
              {photoStorage.photoCount}枚 / {photoStorage.totalSizeBytes} bytes
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300">
              {photoStorage.storagePath}
            </div>
            <ul className="mt-2 grid gap-1">
              {photoStorage.photos.map((photo) => (
                <li key={photo.id} className="text-xs">
                  <a
                    href={photo.blobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
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
