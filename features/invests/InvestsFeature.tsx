'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

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
      redirectTimerRef.current = setTimeout(() => {
        router.push(`/invests/${selectedAlbumId}/insight`);
      }, 1200);
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
    <div className="min-h-full bg-background-light p-5">
      <form onSubmit={onSubmit}>
        <div className="mx-auto max-w-md space-y-4 pb-24">
          {/* ページヘッダーカード */}
          <div className="rounded-xl bg-white px-5 py-4 shadow-card">
            <h1 className="text-[15px] font-semibold text-gray-900">
              積み立て
            </h1>
            <p className="mt-1 text-[13px] text-gray-500">
              エモタイプとアルバムを選んで写真をアップロードします。
            </p>
          </div>

          {/* Step 1: エモタイプ選択 */}
          <div className="rounded-xl bg-white px-4 py-4 shadow-card">
            <EmoTypeSelector value={emoType} onChange={handleEmoTypeChange} />
          </div>

          {/* Step 1b: グループ選択 */}
          {emoType === 'SHARED' && (
            <div className="rounded-xl bg-white px-4 py-4 shadow-card">
              <GroupSelector
                groups={groups}
                selectedGroupId={selectedGroupId}
                onSelect={handleGroupChange}
              />
            </div>
          )}

          {/* Step 2: アルバム選択 or 作成 */}
          {showAlbumStep && (
            <div className="rounded-xl bg-white px-4 py-4 shadow-card">
              <AlbumSelector
                albums={filteredAlbums}
                selectedAlbumId={selectedAlbumId}
                isCreating={isAlbumCreating}
                onSelect={setSelectedAlbumId}
                onCreate={handleCreateAlbum}
              />
            </div>
          )}

          {/* Step 3: 写真 + タグ + アップロード */}
          {selectedAlbumId && (
            <div className="space-y-4 rounded-xl bg-white px-4 py-4 shadow-card">
              <PhotoPicker files={photoFiles} onFilesChange={setPhotoFiles} />

              <TagInput
                tags={tags}
                suggestions={selectedAlbum?.createdTags ?? []}
                onTagsChange={setTags}
              />

              {isUploading && uploadProgress > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-green transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <InvestResult message={message} isError={isError} />

              <button
                type="submit"
                disabled={isUploading || photoFiles.length === 0}
                className="w-full rounded-xl bg-green py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {isUploading
                  ? `アップロード中... (${uploadProgress}%)`
                  : '積み立てる'}
              </button>
            </div>
          )}

          {/* アルバム未選択時のメッセージ */}
          {!selectedAlbumId && message && (
            <div className="rounded-xl bg-white px-4 py-3 shadow-card">
              <InvestResult message={message} isError={isError} />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
