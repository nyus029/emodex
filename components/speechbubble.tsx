import React from 'react';

type SpeechBubbleProps = {
  text: string;
  className?: string;
  tail?: 'left' | 'none';
};

export default function SpeechBubble({
  text,
  className = '',
  tail = 'left',
}: SpeechBubbleProps) {
  return (
    <div className={['relative inline-block', className].join(' ')}>
      {/* 影をまとめて付ける“外枠” */}
      <div className="relative shadow-card rounded-lg">
        {/* 本体 */}
        <div className="bg-white px-8 py-6 rounded-lg">
          <p className="text-black text-sm font-semibold">{text}</p>
        </div>

        {/* しっぽ（三角） */}
        {tail === 'left' && (
          <span
            aria-hidden="true"
            className="
              absolute left-0 top-1/2
              -translate-x-full -translate-y-1/2
              w-0 h-0
              border-y-12 border-y-transparent
              border-r-16 border-r-white
            "
          />
        )}
      </div>
    </div>
  );
}
