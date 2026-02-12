import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '24px',
          color: '#ffffff',
          display: 'flex',
          fontSize: 96,
          fontWeight: 700,
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        E
      </div>
    ),
    size,
  );
}
