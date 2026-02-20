'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import AlbumCreateForm from '@/components/albums/AlbumCreateForm';
import AlbumDetailPanel from '@/components/albums/AlbumDetailPanel';
import PhotoStorageBulkForm from '@/components/albums/PhotoStorageBulkForm';
import ChatForm from '@/components/chat/ChatForm';
import ChatResponse from '@/components/chat/ChatResponse';
import NotificationTest from '@/components/notification/NotificationTest';
import AuthTestSetComponent from '@/components/auth/AuthTestSetComponent';
import type { AlbumResponse } from '@/lib/albums';
import { toPathSegment } from '@/lib/path';

const isPwaStandalone = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
};

export default function HomeFeature() {
  const [input, setInput] = useState(
    'Mastra をローカルで動かす最小セットを教えて',
  );
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] =
    useState('通知テストを送信しました。');
  const [albumName, setAlbumName] = useState('家族アルバム');
  const [plannedDividend, setPlannedDividend] = useState('');
  const [albumTags, setAlbumTags] = useState('家族,旅行');
  const [requiredAtAlbumCreation, setRequiredAtAlbumCreation] = useState(false);
  const [photoStorageName, setPhotoStorageName] = useState('initial-photos');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [album, setAlbum] = useState<AlbumResponse | null>(null);
  const [albumMessage, setAlbumMessage] = useState('');
  const [isAlbumCreating, setIsAlbumCreating] = useState(false);
  const [isPhotoStorageAdding, setIsPhotoStorageAdding] = useState(false);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('このブラウザは Notification API に対応していません。');
      return false;
    }

    if (Notification.permission === 'granted') return true;

    if (Notification.permission === 'denied') {
      alert('通知がブロックされています。ブラウザ設定から許可してください。');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const notifyFromBrowser = (body: string) => {
    const notification = new Notification('Web通知 (ブラウザ)', {
      body,
      icon: '/next.svg',
      badge: '/next.svg',
    });

    notification.onclick = () => {
      window.focus();
    };
  };

  const notifyFromServiceWorker = async (body: string) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      alert('Service Worker が利用できないため、PWA通知を送信できません。');
      return;
    }

    const registration =
      (await navigator.serviceWorker.getRegistration('/')) ||
      (await navigator.serviceWorker.register('/push-sw.js'));

    const readyRegistration = registration.active
      ? registration
      : await navigator.serviceWorker.ready;

    readyRegistration.active?.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title: 'PWA通知 (Service Worker)',
        options: {
          body,
          icon: '/next.svg',
          badge: '/next.svg',
          data: { url: '/' },
        },
      },
    });
  };

  const onClickTestNotification = async () => {
    const isGranted = await requestNotificationPermission();
    if (!isGranted) return;

    if (isPwaStandalone()) {
      await notifyFromServiceWorker(notificationMessage);
      return;
    }

    notifyFromBrowser(notificationMessage);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;

    setOutput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        setOutput(payload.error ?? 'stream failed');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlbum = async (id: string) => {
    const response = await fetch(`/api/v1/albums/${id}`);
    const payload = (await response
      .json()
      .catch(() => ({}))) as AlbumResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? 'アルバムの取得に失敗しました');
    }

    setAlbum(payload);
    setSelectedAlbumId(payload.id);
  };

  const onSubmitCreateAlbum = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsAlbumCreating(true);
    setAlbumMessage('');

    try {
      const createdTags = albumTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const requestBody: {
        name: string;
        plannedDividend?: string;
        createdTags?: string[];
        requiredAtAlbumCreation: boolean;
      } = {
        name: albumName.trim(),
        requiredAtAlbumCreation,
      };

      if (plannedDividend) {
        requestBody.plannedDividend = new Date(plannedDividend).toISOString();
      }

      if (createdTags.length > 0) {
        requestBody.createdTags = createdTags;
      }

      const response = await fetch('/api/v1/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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

      setAlbum(payload as AlbumResponse);
      setSelectedAlbumId((payload as AlbumResponse).id);
      setAlbumMessage('アルバムを作成しました。');
    } catch (error) {
      setAlbumMessage(
        error instanceof Error ? error.message : '作成に失敗しました',
      );
    } finally {
      setIsAlbumCreating(false);
    }
  };

  const onSubmitAddPhotoStorages = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!selectedAlbumId.trim()) {
      setAlbumMessage('先にアルバムを作成してください。');
      return;
    }

    if (!photoStorageName.trim()) {
      setAlbumMessage('photo_storage 名を入力してください。');
      return;
    }

    if (photoFiles.length === 0) {
      setAlbumMessage('画像ファイルを選択してください。');
      return;
    }

    setIsPhotoStorageAdding(true);
    setAlbumMessage('');
    const uploadedBlobUrls: string[] = [];
    let isCleanupDone = false;

    const cleanupUploadedBlobs = async () => {
      if (isCleanupDone || uploadedBlobUrls.length === 0) {
        return;
      }

      isCleanupDone = true;
      await fetch('/api/blob/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: uploadedBlobUrls }),
      }).catch(() => undefined);
    };

    try {
      if (!album) {
        throw new Error('アルバム情報を取得できません');
      }

      const storagePath = `${album.albumBasicInfo.rootPath}/${toPathSegment(photoStorageName)}`;
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
            name: photoStorageName.trim(),
            files: uploadedFiles,
          }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as
        | {
            error?: string;
          }
        | {
            photoStorage: {
              photoCount: number;
            };
          };
      if (!response.ok) {
        await cleanupUploadedBlobs();
        throw new Error(
          'error' in payload
            ? (payload.error ?? 'フォト追加に失敗しました')
            : 'フォト追加に失敗しました',
        );
      }

      await fetchAlbum(selectedAlbumId);
      setPhotoFiles([]);
      setAlbumMessage(
        'photoStorage' in payload
          ? `${payload.photoStorage.photoCount}枚の画像を追加しました。`
          : '画像を追加しました。',
      );
    } catch (error) {
      await cleanupUploadedBlobs();
      setAlbumMessage(
        error instanceof Error ? error.message : 'フォト追加に失敗しました',
      );
    } finally {
      setIsPhotoStorageAdding(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <AuthTestSetComponent />
      <div>
        <Link
          href="/admin"
          className="text-sm underline hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          管理者インターフェースへ移動
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Mastra Stream Chat (Local MVP)</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        OPENAI_API_KEY が未設定でもモックで stream 表示できます。
      </p>

      <ChatForm
        value={input}
        isLoading={isLoading}
        onChange={setInput}
        onSubmit={onSubmit}
      />

      <ChatResponse output={output} />

      <NotificationTest
        value={notificationMessage}
        onChange={setNotificationMessage}
        onTest={onClickTestNotification}
      />

      <section className="grid gap-4 border-t pt-6">
        <h2 className="text-2xl font-bold">Albums API Playground</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          アルバム作成とフォトストレージ一括追加をこの画面から確認できます。
        </p>
        <AlbumCreateForm
          name={albumName}
          plannedDividend={plannedDividend}
          tags={albumTags}
          requiredAtAlbumCreation={requiredAtAlbumCreation}
          isSubmitting={isAlbumCreating}
          onNameChange={setAlbumName}
          onPlannedDividendChange={setPlannedDividend}
          onTagsChange={setAlbumTags}
          onRequiredAtAlbumCreationChange={setRequiredAtAlbumCreation}
          onSubmit={onSubmitCreateAlbum}
        />
        <PhotoStorageBulkForm
          albumId={selectedAlbumId || '未選択'}
          storageName={photoStorageName}
          files={photoFiles}
          isSubmitting={isPhotoStorageAdding}
          onStorageNameChange={setPhotoStorageName}
          onFilesChange={setPhotoFiles}
          onSubmit={onSubmitAddPhotoStorages}
        />
        {albumMessage ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            {albumMessage}
          </p>
        ) : null}
        <AlbumDetailPanel album={album} />
      </section>
    </main>
  );
}
