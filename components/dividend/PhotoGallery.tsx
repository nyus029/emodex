'use client';

import { useState } from 'react';
import FullscreenImageViewer from './FullscreenImageViewer';

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
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
        写真がありません
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative aspect-square">
            <button
              type="button"
              className="h-full w-full"
              onClick={() => setViewerIndex(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.blobUrl}
                alt={photo.fileName}
                className="h-full w-full rounded object-cover"
                loading="lazy"
              />
            </button>
          </div>
        ))}
      </div>
      {viewerIndex !== null && (
        <FullscreenImageViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
