'use client';

import Image from 'next/image';
import React from 'react';
import SpeechBubble from '@/components/speechbubble';
import { useAgentComment } from '@/lib/agent-comment-context';
import { useUser } from '@auth0/nextjs-auth0/client';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  avatarSrc?: string;
  onBellClick?: () => void;
  onAvatarClick?: () => void;
};

const DEFAULT_BUBBLE_TEXT = 'エージェントからのコメントが表示される';

export default function Header({
  title = 'Emodex',
  subtitle = 'EMOI × INDEX',
  avatarSrc = '/users.svg',
  onBellClick,
  onAvatarClick,
}: HeaderProps) {
  const { agentComment } = useAgentComment();
  const { user } = useUser();
  const [currentAvatarSrc, setCurrentAvatarSrc] =
    React.useState<string>(avatarSrc);

  React.useEffect(() => {
    setCurrentAvatarSrc(user?.picture ?? avatarSrc);
  }, [user?.picture, avatarSrc]);

  return (
    <div>
      {/* Header */}
      {/* pt-safe: iOS ノッチ・ステータスバー分の safe area を確保 */}
      <header className="w-full shadow-card bg-white pt-safe">
        <div className="mx-auto max-w-5xl px-4 py-3.5">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-3">
              <Image
                src="/icon.svg"
                width={40}
                height={40}
                alt="Emodex logo"
                className="h-10 w-10"
              />

              <div className="leading-tight">
                <div className="text-lg font-semibold text-gray-900">
                  {title}
                </div>
                <div className="text-xs tracking-wide text-green-700 font-semibold">
                  {subtitle}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              {/* タッチターゲット最小 44px を確保 */}
              <button
                type="button"
                onClick={onBellClick}
                className="h-11 w-11 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-green-700"
                >
                  <path
                    d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.73 21a2 2 0 01-3.46 0"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={onAvatarClick}
                className="h-11 w-11 rounded-full overflow-hidden border hover:opacity-90 flex items-center justify-center"
              >
                <Image
                  src={currentAvatarSrc}
                  alt="avatar"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-cover"
                  unoptimized={true}
                  onError={() => setCurrentAvatarSrc('/users.svg')}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative w-full bg-background-light overflow-hidden">
        {/* wave（背景） */}
        <Image
          src="/wave.svg"
          alt="wave"
          width={393}
          height={104}
          sizes="100vw"
          className="absolute left-0 top-1 w-full h-auto z-0"
        />

        {/* 中身 */}
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* human: モバイルでやや小さく */}
            <Image
              src="/human.svg"
              alt="human"
              width={50}
              height={75}
              sizes="80px"
              className="w-14 sm:w-20 h-auto shrink-0"
            />

            {/* 吹き出し */}
            <SpeechBubble
              text={agentComment || DEFAULT_BUBBLE_TEXT}
              className="w-full min-w-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
