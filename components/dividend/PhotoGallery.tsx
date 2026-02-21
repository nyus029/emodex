interface Photo {
  id: string;
  fileName: string;
  blobUrl: string;
  contentType: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
        写真がありません
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {photos.map((photo) => (
        <div key={photo.id} className="relative aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.blobUrl}
            alt={photo.fileName}
            className="h-full w-full rounded object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
