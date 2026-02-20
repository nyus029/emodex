/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import AlbumCreateForm from '@/components/albums/AlbumCreateForm';
import AlbumDetailPanel from '@/components/albums/AlbumDetailPanel';
import PhotoStorageBulkForm from '@/components/albums/PhotoStorageBulkForm';

describe('albums UI', () => {
  it('AlbumCreateForm renders expected labels and disabled submit state', () => {
    render(
      <AlbumCreateForm
        name="家族アルバム"
        plannedDividend=""
        tags="家族,旅行"
        requiredAtAlbumCreation={false}
        isSubmitting={true}
        onNameChange={() => {}}
        onPlannedDividendChange={() => {}}
        onTagsChange={() => {}}
        onRequiredAtAlbumCreationChange={() => {}}
        onSubmit={() => {}}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'アルバム作成' }),
    ).toBeInTheDocument();
    expect(screen.getByText('アルバム名')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '作成中...' })).toBeDisabled();
  });

  it('AlbumCreateForm forwards input/checkbox changes and submit', () => {
    const handlers = {
      onNameChange: jest.fn(),
      onPlannedDividendChange: jest.fn(),
      onTagsChange: jest.fn(),
      onRequiredAtAlbumCreationChange: jest.fn(),
      onSubmit: jest.fn((event: FormEvent<HTMLFormElement>) =>
        event.preventDefault(),
      ),
    };

    render(
      <AlbumCreateForm
        name="init"
        plannedDividend=""
        tags=""
        requiredAtAlbumCreation={false}
        isSubmitting={false}
        {...handlers}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('家族アルバム'), {
      target: { value: 'new name' },
    });
    fireEvent.change(screen.getByLabelText('配当予定日時（任意）'), {
      target: { value: '2026-02-20T12:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('家族,旅行,イベント'), {
      target: { value: 'a,b' },
    });
    fireEvent.click(screen.getByLabelText('アルバム作成時に必須'));
    fireEvent.submit(screen.getByRole('button', { name: 'アルバムを作成' }));

    expect(handlers.onNameChange).toHaveBeenCalledWith('new name');
    expect(handlers.onPlannedDividendChange).toHaveBeenCalledWith(
      '2026-02-20T12:00',
    );
    expect(handlers.onTagsChange).toHaveBeenCalledWith('a,b');
    expect(handlers.onRequiredAtAlbumCreationChange).toHaveBeenCalledWith(true);
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('PhotoStorageBulkForm renders album id and selected file count', () => {
    render(
      <PhotoStorageBulkForm
        albumId="album-1"
        storageName="travel"
        files={[{ name: 'a.jpg' } as File, { name: 'b.jpg' } as File]}
        isSubmitting={false}
        onStorageNameChange={() => {}}
        onFilesChange={() => {}}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByText('対象アルバムID: album-1')).toBeInTheDocument();
    expect(screen.getByText('選択中: 2 件')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '一括追加' }),
    ).toBeInTheDocument();
  });

  it('PhotoStorageBulkForm forwards input/file/submit events', () => {
    const onStorageNameChange = jest.fn();
    const onFilesChange = jest.fn();
    const onSubmit = jest.fn((event: FormEvent<HTMLFormElement>) =>
      event.preventDefault(),
    );

    render(
      <PhotoStorageBulkForm
        albumId="album-1"
        storageName="init"
        files={[]}
        isSubmitting={false}
        onStorageNameChange={onStorageNameChange}
        onFilesChange={onFilesChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('2026-02-旅行'), {
      target: { value: 'new-storage' },
    });

    const fileInput = screen.getByLabelText(
      '画像ファイル（複数選択可）',
    ) as HTMLInputElement;
    const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [fileA, fileB] } });

    fireEvent.submit(screen.getByRole('button', { name: '一括追加' }));

    expect(onStorageNameChange).toHaveBeenCalledWith('new-storage');
    expect(onFilesChange).toHaveBeenCalledTimes(1);
    expect((onFilesChange.mock.calls[0] as [File[]])[0]).toHaveLength(2);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('AlbumDetailPanel renders empty state when album is null', () => {
    render(<AlbumDetailPanel album={null} />);
    expect(screen.getByText('まだアルバムがありません。')).toBeInTheDocument();
  });

  it('AlbumDetailPanel renders album details and photos', () => {
    render(
      <AlbumDetailPanel
        album={{
          id: 'album-1',
          albumBasicInfo: {
            albumName: '家族アルバム',
            rootPath: 'family',
            createdAt: '2026-02-20T10:00:00.000Z',
            plannedDividend: null,
            createdTags: [],
            requiredAtAlbumCreation: false,
          },
          photoStorageSummary: {
            totalStorages: 1,
            totalPhotos: 2,
            totalSizeBytes: 300,
            lastAddedAt: '2026-02-20T10:00:00.000Z',
          },
          photoStorages: [
            {
              id: 'ps-1',
              name: 'travel',
              storagePath: 'family/travel',
              photoCount: 2,
              totalSizeBytes: 300,
              createdAt: '2026-02-20T10:00:00.000Z',
              photos: [
                {
                  id: 'p-1',
                  fileName: 'a.jpg',
                  blobPath: 'family/travel/a.jpg',
                  blobUrl: 'https://example.com/a.jpg',
                  contentType: 'image/jpeg',
                  sizeBytes: 100,
                },
                {
                  id: 'p-2',
                  fileName: 'b.jpg',
                  blobPath: 'family/travel/b.jpg',
                  blobUrl: 'https://example.com/b.jpg',
                  contentType: 'image/jpeg',
                  sizeBytes: 200,
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('名前: 家族アルバム')).toBeInTheDocument();
    expect(screen.getByText('ストレージ数: 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'a.jpg' })).toHaveAttribute(
      'href',
      'https://example.com/a.jpg',
    );
    expect(screen.getByRole('link', { name: 'b.jpg' })).toHaveAttribute(
      'href',
      'https://example.com/b.jpg',
    );
  });
});
