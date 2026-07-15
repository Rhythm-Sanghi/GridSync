'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomCode } from '@/lib/roomCode';

// Static preview pattern (decorative — not interactive)
const PREVIEW_PATTERNS = [
  [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0], // kick
  [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], // snare
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], // hihat
];
const PREVIEW_COLORS = ['#c87010','#a03028','#9a8020'];

export default function LandingPage() {
  const router   = useRouter();
  const [loading, setLoading] = useState(false);

  const handleOpen = useCallback(async () => {
    setLoading(true);
    const code = generateRoomCode();
    sessionStorage.setItem(`gridsync_role_${code}`, 'host');
    router.push(`/room/${code}`);
  }, [router]);

  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center px-5 py-16"
      style={{ zIndex: 1 }}
    >
      {/* ── Hero ── */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center gap-10 animate-[fadeIn_0.5s_ease-out]">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <h1
            className="font-display italic font-semibold leading-none tracking-tight select-none"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 7rem)', color: 'var(--ink)' }}
          >
            Grid<span style={{ color: 'var(--brass-light)' }}>-</span>Sync
          </h1>
          <p
            className="font-mono text-xs uppercase tracking-[0.3em]"
            style={{ color: 'var(--ink-mute)' }}
          >
            Sixteen&thinsp;&middot;&thinsp;Step&thinsp;&middot;&thinsp;Collaborative&thinsp;&middot;&thinsp;Sequencer
          </p>
        </div>

        {/* Thin ruled divider */}
        <div className="w-full flex items-center gap-4">
          <div className="hw-rule flex-1" />
          <span className="font-mono text-2xs uppercase tracking-[0.25em]" style={{ color: 'var(--ink-mute)' }}>
            Preview
          </span>
          <div className="hw-rule flex-1" />
        </div>

        {/* Decorative grid preview */}
        <div
          className="hw-panel w-full px-5 pt-5 pb-4 overflow-x-auto"
          aria-hidden="true"
        >
          <div className="min-w-[360px]">
            {/* Beat labels */}
            <div className="flex gap-1 mb-2 pl-0">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 text-center font-mono"
                  style={{
                    fontSize: '9px',
                    color: i % 4 === 0 ? 'var(--ink-dim)' : 'var(--border-warm)',
                  }}
                >
                  {i % 4 === 0 ? String(i / 4 + 1) : '·'}
                </div>
              ))}
            </div>

            {/* Step rows */}
            {PREVIEW_PATTERNS.map((row, ri) => (
              <div key={ri} className="flex gap-1 mb-1">
                {row.map((active, si) => (
                  <div
                    key={si}
                    className="flex-1 rounded-[2px]"
                    style={{
                      height: '28px',
                      backgroundColor: active ? PREVIEW_COLORS[ri] : 'var(--bg-inset)',
                      border: `1px solid ${active ? 'transparent' : 'var(--border-dim)'}`,
                      boxShadow: active
                        ? `inset 0 1px 0 rgba(255,230,180,0.2), 0 0 7px ${PREVIEW_COLORS[ri]}55`
                        : 'inset 0 1px 0 rgba(255,200,120,0.04), inset 0 -1px 0 rgba(0,0,0,0.45)',
                    }}
                  />
                ))}
              </div>
            ))}

            {/* Beat dots */}
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 flex justify-center"
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: 4,
                      height: 4,
                      backgroundColor: i % 4 === 0 ? 'var(--border-warm)' : 'var(--border-dim)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            id="btn-open-room"
            className="hw-btn hw-btn-amber w-full sm:w-auto sm:min-w-[220px]"
            style={{ fontSize: '13px', padding: '14px 36px', letterSpacing: '0.18em' }}
            onClick={handleOpen}
            disabled={loading}
            aria-label="Open a new jam room"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block rounded-full border-2 border-current border-t-transparent"
                  style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }}
                />
                Opening Room
              </span>
            ) : (
              'Open a Room'
            )}
          </button>
          <p className="font-mono text-2xs" style={{ color: 'var(--ink-mute)', letterSpacing: '0.15em' }}>
            No account&thinsp;&middot;&thinsp;No download&thinsp;&middot;&thinsp;Runs in your browser
          </p>
        </div>

        {/* How it works */}
        <div className="w-full flex flex-col gap-6 pt-2">
          <div className="w-full flex items-center gap-4">
            <div className="hw-rule flex-1" />
            <span className="font-mono text-2xs uppercase tracking-[0.3em]" style={{ color: 'var(--ink-mute)' }}>
              How it works
            </span>
            <div className="hw-rule flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ borderColor: 'var(--border-dim)' }}>
            {[
              {
                num: 'I',
                title: 'Start',
                body: 'Click the button. A room code generates instantly — no sign-up, no wait.',
              },
              {
                num: 'II',
                title: 'Share',
                body: 'Copy the four-letter code or the full link and send it to your collaborators.',
              },
              {
                num: 'III',
                title: 'Play',
                body: 'Toggle steps on the shared grid. Every change syncs to all members in real time.',
              },
            ].map(({ num, title, body }) => (
              <div
                key={num}
                className="hw-panel flex flex-col gap-3 p-5 text-left"
              >
                <span
                  className="font-display italic font-semibold leading-none"
                  style={{ fontSize: '2.25rem', color: 'var(--brass)' }}
                >
                  {num}
                </span>
                <div className="hw-rule" />
                <p
                  className="font-mono text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--ink-dim)' }}
                >
                  {title}
                </p>
                <p
                  className="font-mono text-xs leading-relaxed"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer line */}
        <p className="font-mono text-2xs" style={{ color: 'var(--ink-mute)', letterSpacing: '0.12em' }}>
          Grid-Sync &mdash; browser-based &middot; peer-to-peer &middot; open source
        </p>
      </div>
    </main>
  );
}
