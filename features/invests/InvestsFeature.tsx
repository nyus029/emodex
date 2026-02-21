'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import EmoTypeSelector from '@/components/invests/EmoTypeSelector';
import GroupSelector from '@/components/invests/GroupSelector';
import AlbumSelector from '@/components/invests/AlbumSelector';
import PhotoPicker from '@/components/invests/PhotoPicker';
import TagInput from '@/components/invests/TagInput';
import InvestResult from '@/components/invests/InvestResult';
import type { AlbumListItem, AlbumResponse } from '@/lib/albums';
import { toPathSegment } from '@/lib/path';
import { generateStorageName } from '@/lib/invest';
import type { GroupItem } from '@/types/api';

export default function InvestsFeature() {
  const [emoType, setEmoType] = useState<'PRIVATE' | 'SHARED'>('PRIVATE');
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const [albums, setAlbums] = useState<AlbumListItem[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [isAlbumCreating, setIsAlbumCreating] = useState(false);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const filteredAlbums = albums.filter((a) => {
    if (emoType === 'PRIVATE') return a.albumType === 'PRIVATE';
    return a.albumType === 'SHARED' && a.groupId === selectedGroupId;
  });

  const selectedAlbum =
    filteredAlbums.find((a) => a.id === selectedAlbumId) ?? null;

  const fetchAlbums = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/albums');
      if (!response.ok) return;
      const data = (await response.json()) as AlbumListItem[];
      setAlbums(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/groups');
      if (!response.ok) return;
      const data = (await response.json()) as GroupItem[];
      setGroups(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
    fetchGroups();
  }, [fetchAlbums, fetchGroups]);

  const handleEmoTypeChange = (type: 'PRIVATE' | 'SHARED') => {
    setEmoType(type);
    setSelectedAlbumId('');
    setSelectedGroupId(null);
  };

  const handleGroupChange = (groupId: number | null) => {
    setSelectedGroupId(groupId);
    setSelectedAlbumId('');
  };

  const handleCreateAlbum = async (name: string) => {
    setIsAlbumCreating(true);
    setMessage('');
    setIsError(false);

    try {
      const body: {
        name: string;
        albumType?: 'PRIVATE' | 'SHARED';
        groupId?: number;
      } = { name };

      if (emoType === 'SHARED' && selectedGroupId) {
        body.albumType = 'SHARED';
        body.groupId = selectedGroupId;
      }

      const response = await fetch('/api/v1/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | AlbumResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          'error' in payload
            ? (payload.error ?? 'アルバム作成に失敗しました')
            : 'アルバム作成に失敗しました',
        );
      }

      const created = payload as AlbumResponse;
      await fetchAlbums();
      setSelectedAlbumId(created.id);
      setMessage(
        `アルバム「${created.albumBasicInfo.albumName}」を作成しました。`,
      );
      setIsError(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'アルバム作成に失敗しました',
      );
      setIsError(true);
    } finally {
      setIsAlbumCreating(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAlbumId || !selectedAlbum) {
      setMessage('アルバムを選択してください。');
      setIsError(true);
      return;
    }

    if (photoFiles.length === 0) {
      setMessage('画像ファイルを選択してください。');
      setIsError(true);
      return;
    }

    setIsUploading(true);
    setMessage('');
    setIsError(false);
    setUploadProgress(0);

    const uploadedBlobUrls: string[] = [];
    let isCleanupDone = false;

    const cleanupUploadedBlobs = async () => {
      if (isCleanupDone || uploadedBlobUrls.length === 0) return;
      isCleanupDone = true;
      await fetch('/api/blob/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: uploadedBlobUrls }),
      }).catch(() => undefined);
    };

    try {
      const storageName = generateStorageName();
      const storagePath = `${selectedAlbum.rootPath}/${toPathSegment(storageName)}`;

      const uploadedFiles = await Promise.all(
        photoFiles.map(async (file, index) => {
          const filePath = `${storagePath}/${Date.now()}-${index + 1}-${toPathSegment(file.name)}`;
          const blob = await upload(filePath, file, {
            access: 'public',
            handleUploadUrl: '/api/blob/upload',
            clientPayload: JSON.stringify({
              albumId: selectedAlbumId,
              storagePath,
            }),
          });
          uploadedBlobUrls.push(blob.url);
          setUploadProgress(
            Math.round(((index + 1) / photoFiles.length) * 100),
          );

          return {
            fileName: file.name,
            blobPath: blob.pathname,
            blobUrl: blob.url,
            contentType: file.type || undefined,
            sizeBytes: file.size,
          };
        }),
      );

      const response = await fetch(
        `/api/v1/albums/${selectedAlbumId}/photo-storages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: storageName,
            tags: tags.length > 0 ? tags : undefined,
            files: uploadedFiles,
          }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as
        | { error?: string }
        | { photoStorage: { photoCount: number } };

      if (!response.ok) {
        await cleanupUploadedBlobs();
        throw new Error(
          'error' in payload
            ? (payload.error ?? 'フォト追加に失敗しました')
            : 'フォト追加に失敗しました',
        );
      }

      setPhotoFiles([]);
      setTags([]);
      setUploadProgress(100);
      await fetchAlbums();

      const count =
        'photoStorage' in payload ? payload.photoStorage.photoCount : 0;
      setMessage(
        count > 0 ? `${count}枚の画像を追加しました。` : '画像を追加しました。',
      );
      setIsError(false);
    } catch (error) {
      await cleanupUploadedBlobs();
      setMessage(
        error instanceof Error ? error.message : 'フォト追加に失敗しました',
      );
      setIsError(true);
    } finally {
      setIsUploading(false);
    }
  };

  const isSharedReady = emoType === 'SHARED' && selectedGroupId !== null;
  const showAlbumStep = emoType === 'PRIVATE' || isSharedReady;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 pb-24">
      <div>
        <Link
          href="/"
          className="text-sm underline hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ホームへ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold">フォトストレージ積み立て</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        エモタイプとアルバムを選んで写真をアップロードします。
      </p>

      <form onSubmit={onSubmit} className="grid gap-4 rounded border p-4">
        {/* Step 1: エモタイプ選択 */}
        <EmoTypeSelector value={emoType} onChange={handleEmoTypeChange} />

        {emoType === 'SHARED' && (
          <GroupSelector
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelect={handleGroupChange}
          />
        )}

        {/* Step 2: アルバム選択 or 作成 */}
        {showAlbumStep && (
          <AlbumSelector
            albums={filteredAlbums}
            selectedAlbumId={selectedAlbumId}
            isCreating={isAlbumCreating}
            onSelect={setSelectedAlbumId}
            onCreate={handleCreateAlbum}
          />
        )}

        {/* Step 3: 写真 + タグ + アップロード */}
        {selectedAlbumId && (
          <>
            <PhotoPicker files={photoFiles} onFilesChange={setPhotoFiles} />

            <TagInput
              tags={tags}
              suggestions={selectedAlbum?.createdTags ?? []}
              onTagsChange={setTags}
            />

            {isUploading && uploadProgress > 0 && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full bg-black transition-all dark:bg-white"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || photoFiles.length === 0}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {isUploading
                ? `アップロード中... (${uploadProgress}%)`
                : '積み立てる'}
            </button>
          </>
        )}

        <InvestResult message={message} isError={isError} />
      </form>
    </main>
  );
}
