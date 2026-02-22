'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import AlbumMoversSection, {
  type MoverAlbum,
} from '@/components/mood/AlbumMoversSection';
import UnifiedMoodForm from '@/components/sentences/UnifiedMoodForm';
import { useAgentComment } from '@/lib/agent-comment-context';

type SuggestedAlbumItem = {
  id: string;
  name: string;
  reason?: string;
};

type ShockedAlbumItem = {
  id: string;
  name: string;
  reason?: string;
  shockRate: number;
};

export default function HomeFeature() {
  const [selectedSuggestedWords, setSelectedSuggestedWords] = useState<
    string[]
  >([]);
  const [customWords, setCustomWords] = useState<string[]>([]);
  const allSelectedWords = [...selectedSuggestedWords, ...customWords];
  const [generatedSentence, setGeneratedSentence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moodRecommendationText, setMoodRecommendationText] = useState('');
  const [suggestedWords, setSuggestedWords] = useState<string[]>([]);
  const [suggestedWordsLoading, setSuggestedWordsLoading] = useState(false);
  const [suggestedAlbums, setSuggestedAlbums] = useState<SuggestedAlbumItem[]>(
    [],
  );
  const [shockedAlbums, setShockedAlbums] = useState<ShockedAlbumItem[]>([]);
  const [suggestedAlbumsError, setSuggestedAlbumsError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [moversRisers, setMoversRisers] = useState<MoverAlbum[]>([]);
  const [moversFallers, setMoversFallers] = useState<MoverAlbum[]>([]);
  const [moversLoading, setMoversLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const SENTENCE_STORAGE_KEY = 'sentence-from-words-output';
  const { user: authUser } = useUser();
  const { clearAgentComment, appendAgentComment, setAgentComment } =
    useAgentComment();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(SENTENCE_STORAGE_KEY);
      if (saved) setGeneratedSentence(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    setSuggestedWordsLoading(true);
    fetch('/api/v1/mood/suggested-words')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { suggestedWords?: string[] } | null) => {
        if (
          !cancelled &&
          data?.suggestedWords &&
          data.suggestedWords.length > 0
        ) {
          setSuggestedWords(data.suggestedWords);
        }
      })
      .catch(() => {
        // fallback to default words
      })
      .finally(() => {
        if (!cancelled) setSuggestedWordsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    fetch('/api/auth/admin-check')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { isAdmin?: boolean } | null) => {
        if (!cancelled && data) {
          setIsAdmin(!!data.isAdmin);
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    setMoversLoading(true);
    fetch('/api/v1/albums/movers')
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { risers?: MoverAlbum[]; fallers?: MoverAlbum[] } | null) => {
          if (!cancelled && data) {
            setMoversRisers(data.risers ?? []);
            setMoversFallers(data.fallers ?? []);
          }
        },
      )
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setMoversLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const startCooldownTimer = useCallback((seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldownSeconds(seconds);
    if (seconds <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!authUser) return;
    fetch('/api/v1/mood/cooldown')
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { isCooldown?: boolean; remainingSeconds?: number } | null) => {
          if (data?.isCooldown && data.remainingSeconds) {
            startCooldownTimer(data.remainingSeconds);
          }
        },
      )
      .catch(() => {
        // ignore
      });
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [authUser, startCooldownTimer]);

  const handleToggleSuggested = (word: string) => {
    setSelectedSuggestedWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  };

  const handleAddCustom = (word: string) => {
    setCustomWords((prev) => (prev.includes(word) ? prev : [...prev, word]));
  };

  const handleRemoveCustom = (word: string) => {
    setCustomWords((prev) => prev.filter((w) => w !== word));
  };

  const handleUnifiedSubmit = async () => {
    if (allSelectedWords.length === 0) return;
    setIsSubmitting(true);
    setMoodRecommendationText('');
    setSuggestedAlbumsError('');
    setSuggestedAlbums([]);
    setShockedAlbums([]);
    clearAgentComment();

    try {
      if (authUser) {
        // Logged in: save mood + fetch suggested albums
        const res = await fetch('/api/v1/mood/sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            words: allSelectedWords,
            includeRecommendation: true,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          sentence?: string;
          recommendationText?: string;
          recordId?: string;
          error?: string;
        };
        if (!res.ok) {
          setAgentComment(data?.error ?? `HTTP ${res.status}`);
          return;
        }
        if (typeof data.sentence === 'string') {
          setGeneratedSentence(data.sentence);
          startCooldownTimer(3600);
          try {
            localStorage.setItem(SENTENCE_STORAGE_KEY, data.sentence);
          } catch {
            // ignore
          }
        }
        if (
          typeof data.recommendationText === 'string' &&
          data.recommendationText
        ) {
          setMoodRecommendationText(data.recommendationText);
        }

        // Fetch suggested albums
        try {
          const albumRes = await fetch('/api/v1/mood/suggested-albums');
          const albumData = (await albumRes.json().catch(() => ({}))) as {
            suggestedAlbums?: SuggestedAlbumItem[];
            shockedAlbums?: ShockedAlbumItem[];
            message?: string;
            error?: string;
          };
          if (albumRes.ok) {
            setSuggestedAlbums(albumData.suggestedAlbums ?? []);
            setShockedAlbums(albumData.shockedAlbums ?? []);
            if (
              (albumData.suggestedAlbums ?? []).length === 0 &&
              albumData.message
            ) {
              setSuggestedAlbumsError(albumData.message);
            }
          } else {
            setSuggestedAlbumsError(albumData?.error ?? '取得に失敗しました');
          }
        } catch {
          setSuggestedAlbumsError('アルバム推薦の取得に失敗しました');
        }
      } else {
        // Not logged in: stream sentence generation
        const res = await fetch('/api/v1/sentences/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words: allSelectedWords }),
        });

        if (!res.ok) {
          const raw = await res.json().catch(() => ({}));
          const d = raw as { error?: string; details?: string };
          const errorMsg =
            (d?.error && typeof d.error === 'string' ? d.error : null) ||
            (d?.details && typeof d.details === 'string' ? d.details : null) ||
            `HTTP ${res.status}`;
          const msg = `エラー: ${errorMsg}`;
          setAgentComment(msg);
          setGeneratedSentence(msg);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setAgentComment('エラー: ストリームを開始できません');
          setGeneratedSentence('エラー: ストリームを開始できません');
          return;
        }

        const decoder = new TextDecoder();
        let fullText = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            appendAgentComment(chunk);
          }
        } finally {
          reader.releaseLock();
        }

        fullText = fullText.trim();
        if (fullText) {
          flushSync(() => setGeneratedSentence(fullText));
          try {
            localStorage.setItem(SENTENCE_STORAGE_KEY, fullText);
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '処理に失敗しました';
      console.error('Unified submit failed:', err);
      setAgentComment(`エラー: ${msg}`);
      setGeneratedSentence(`エラー: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light p-5">
      <main className="mx-auto grid max-w-md gap-4 pb-24">
        <section className="grid gap-4 rounded-xl bg-white px-4 py-4 shadow-card">
          <div>
            <h2 className="text-[15px] font-medium text-gray-900">
              単語から文章
            </h2>
            <p className="mt-1 text-[13px] text-gray-500">
              感情ワードを選ぶか単語を追加して、文章を生成します。ログイン中は心象として保存し、感情に合うアルバムを提案できます。
            </p>
          </div>
          <UnifiedMoodForm
            suggestedWords={suggestedWords.length > 0 ? suggestedWords : []}
            selectedSuggestedWords={selectedSuggestedWords}
            customWords={customWords}
            isLoading={isSubmitting}
            isLoggedIn={!!authUser}
            isSuggestedWordsLoading={suggestedWordsLoading}
            cooldownSeconds={cooldownSeconds}
            onToggleSuggested={handleToggleSuggested}
            onAddCustom={handleAddCustom}
            onRemoveCustom={handleRemoveCustom}
            onSubmit={handleUnifiedSubmit}
            totalSelectedCount={allSelectedWords.length}
          />
          <section>
            <h2 className="mb-2 text-[13px] font-medium text-gray-900">
              作成された文章
            </h2>
            <pre className="whitespace-pre-wrap text-[13px] text-gray-700">
              {generatedSentence || '（ここに生成された文章が表示されます）'}
            </pre>
          </section>
          {moodRecommendationText && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">
                おすすめの気持ち
              </p>
              <p className="text-sm text-gray-800">{moodRecommendationText}</p>
            </div>
          )}
          {suggestedAlbumsError && (
            <p className="text-sm text-amber-600">{suggestedAlbumsError}</p>
          )}
          {suggestedAlbums.length > 0 && (
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                見た方がいいアルバム
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-800">
                {suggestedAlbums.map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.name}</span>
                    {a.reason && (
                      <span className="text-gray-500"> - {a.reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {shockedAlbums.length > 0 && (
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold text-red-600">
                暴落アルバム
              </h3>
              <ul className="space-y-1 text-sm">
                {shockedAlbums.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2"
                  >
                    <span className="font-medium text-red-700">{a.name}</span>
                    <span className="ml-2 text-xs text-red-500">
                      -{a.shockRate}%
                    </span>
                    {a.reason && (
                      <p className="mt-0.5 text-xs text-red-400">{a.reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {authUser && (
          <section className="rounded-xl bg-white px-4 py-4 shadow-card">
            <h2 className="mb-3 text-[15px] font-medium text-gray-900">
              エモ指数ランキング
            </h2>
            <AlbumMoversSection
              risers={moversRisers}
              fallers={moversFallers}
              loading={moversLoading}
            />
          </section>
        )}

        {isAdmin && (
          <section className="rounded-xl bg-white px-5 py-4 shadow-card">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                管理者インターフェースへ移動
              </Link>
              <Link
                href="/insight"
                className="inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                指数関数グラフへ移動
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
