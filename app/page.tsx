'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomCode } from '@/lib/roomCode';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartJam = useCallback(async () => {
    setLoading(true);
    const code = generateRoomCode();
    // Mark as host by setting a flag in sessionStorage
    sessionStorage.setItem(`gridsync_role_${code}`, 'host');
    router.push(`/room/${code}`);
  }, [router]);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 50% 40%, rgba(0,245,255,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 40% 35% at 30% 60%, rgba(180,0,255,0.05) 0%, transparent 70%),
            radial-gradient(ellipse 40% 35% at 70% 60%, rgba(255,0,168,0.04) 0%, transparent 70%)
          `,
        }}
      />

      {/* Decorative grid preview (static demo cells) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 flex gap-1">
          {[1,0,0,1,0,1,1,0,1,0,0,1,0,0,1,0].map((a, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded"
              style={{
                background: a ? 'rgba(0,245,255,0.6)' : 'rgba(255,255,255,0.04)',
                boxShadow: a ? '0 0 8px rgba(0,245,255,0.4)' : 'none',
              }}
            />
          ))}
        </div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex gap-1 mt-8">
          {[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0].map((a, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded"
              style={{
                background: a ? 'rgba(255,0,168,0.6)' : 'rgba(255,255,255,0.04)',
                boxShadow: a ? '0 0 8px rgba(255,0,168,0.4)' : 'none',
              }}
            />
          ))}
        </div>
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 flex gap-1 mt-8">
          {[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].map((a, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded"
              style={{
                background: a ? 'rgba(168,255,0,0.5)' : 'rgba(255,255,255,0.04)',
                boxShadow: a ? '0 0 6px rgba(168,255,0,0.3)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl animate-fade-in">
        {/* Logo */}
        <div className="mb-8 animate-float">
          <div className="text-6xl sm:text-7xl mb-4 filter drop-shadow-lg">🎛️</div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter">
            <span className="text-glow-cyan" style={{ color: 'var(--neon-cyan)' }}>Grid</span>
            <span className="text-white/90">-</span>
            <span className="text-glow-magenta" style={{ color: 'var(--neon-magenta)' }}>Sync</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-white/50 font-mono tracking-wider uppercase">
            Real-time collaborative beat sequencer
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            { icon: '🎵', label: 'Pure synthesis' },
            { icon: '⚡', label: 'Real-time sync' },
            { icon: '🔗', label: 'No installs' },
            { icon: '🆓', label: '100% free' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white/60"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          id="btn-start-jam"
          className="btn-neon btn-neon-cyan text-lg sm:text-xl px-10 py-4 rounded-xl font-black tracking-wider"
          style={{
            boxShadow: '0 0 40px rgba(0,245,255,0.3), 0 4px 24px rgba(0,245,255,0.2)',
          }}
          onClick={handleStartJam}
          disabled={loading}
          aria-label="Start a new jam room"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Creating room…
            </span>
          ) : (
            '🎹 Start a Jam'
          )}
        </button>

        <p className="mt-4 text-sm text-white/25 font-mono">
          Instant room · Share link · Jam together
        </p>

        {/* How it works */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {[
            {
              step: '01',
              icon: '🚀',
              title: 'Start instantly',
              desc: 'Click the button, get a room code. No signup required.',
            },
            {
              step: '02',
              icon: '🔗',
              title: 'Share the link',
              desc: 'Send the 4-letter code or copy the URL to friends.',
            },
            {
              step: '03',
              icon: '🎶',
              title: 'Jam together',
              desc: 'Toggle steps on a shared neon grid. Hear it in real time.',
            },
          ].map(({ step, icon, title, desc }) => (
            <div
              key={step}
              className="glass-card p-5 text-left flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono font-bold text-white/20 tracking-widest"
                >
                  {step}
                </span>
                <span className="text-2xl">{icon}</span>
              </div>
              <h2 className="font-bold text-white/90">{title}</h2>
              <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
