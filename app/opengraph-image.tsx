/**
 * OpenGraph Social Sharing Image
 *
 * Why: Next.js auto-wires this file as `/opengraph-image.png` and injects
 * it into `<meta property="og:image">`. The edge runtime keeps it lightweight
 * and globally distributed without a cold-start penalty.
 *
 * Constraint: Satori (the renderer behind ImageResponse) only supports inline
 * style objects — no Tailwind classes. All layout is done with flexbox via
 * style props, mirroring the app's "Premium Editorial" dark aesthetic.
 */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Jobmark – Your Career, On Record';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Subtle radial gradient accent top-left */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 500,
            height: 500,
            background:
              'radial-gradient(circle at top left, rgba(168,139,100,0.18), transparent 65%)',
          }}
        />

        {/* Left: icon + wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 14,
              border: '1px solid rgba(168,139,100,0.35)',
              background: 'rgba(168,139,100,0.12)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="#a88b64" strokeWidth="2" strokeLinecap="round" />
              <path
                d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                stroke="#a88b64"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#f5f0e8',
              letterSpacing: '-1.5px',
              lineHeight: 1,
            }}
          >
            Jobmark
          </div>
        </div>

        {/* Right: tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 16,
            maxWidth: 500,
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#a88b64',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Career OS
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#f5f0e8',
              textAlign: 'right',
              lineHeight: 1.15,
              letterSpacing: '-1px',
            }}
          >
            Your Career,{'\n'}On Record
          </div>
          <div
            style={{
              fontSize: 18,
              color: 'rgba(245,240,232,0.55)',
              textAlign: 'right',
              lineHeight: 1.5,
            }}
          >
            Document work. Build evidence.{'\n'}Turn it into reviews that land.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
