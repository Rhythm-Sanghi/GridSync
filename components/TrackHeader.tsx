'use client';

import { memo } from 'react';
import { TrackConfig } from '@/lib/types';

interface TrackHeaderProps {
  config: TrackConfig;
  trackIndex: number;
  onParamChange: (track: number, param: string, value: number | string | boolean) => void;
}

export const TrackHeader = memo(function TrackHeader({
  config,
  trackIndex,
  onParamChange,
}: TrackHeaderProps) {
  const isDrum = ['kick', 'snare', 'hihat', 'hihat-open', 'clap'].includes(config.instrument);

  return (
    <div
      className="w-[72px] shrink-0 flex flex-col justify-center gap-1.5 px-2 py-1 select-none"
    >
      {config.unlocked ? (
        <>
          {/* Label row: color indicator + track name */}
          <div className="flex items-center gap-1.5">
            {/* Color pip */}
            <div
              className="shrink-0 rounded-full"
              style={{
                width: 5,
                height: 5,
                backgroundColor: config.color,
                boxShadow: `0 0 4px ${config.color}88`,
              }}
            />
            {/* Name */}
            <span
              className="font-mono uppercase leading-none truncate"
              style={{
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                color: config.muted ? 'var(--ink-mute)' : 'var(--ink-dim)',
              }}
            >
              {config.label}
            </span>
          </div>

          {/* Controls row: mute toggle + knob */}
          <div className="flex items-center gap-1.5">
            {/* Mute toggle */}
            <button
              className="shrink-0 rounded-sm font-mono transition-all"
              style={{
                width: 20,
                height: 10,
                fontSize: '7px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                border: `1px solid ${config.muted ? 'var(--rust)' : 'var(--border-mid)'}`,
                backgroundColor: config.muted ? 'var(--rust)' : 'var(--bg-inset)',
                color: config.muted ? 'var(--ink)' : 'var(--ink-mute)',
                cursor: 'pointer',
                boxShadow: config.muted
                  ? '0 0 5px rgba(136,48,32,0.5)'
                  : 'inset 0 1px 2px rgba(0,0,0,0.4), 0 1px 0 var(--border-dim)',
              }}
              onClick={() => onParamChange(trackIndex, 'muted', !config.muted)}
              title={config.muted ? 'Unmute' : 'Mute'}
              aria-label={config.muted ? `Unmute ${config.label}` : `Mute ${config.label}`}
            />

            {/* Pitch slider */}
            <input
              type="range"
              className="track-knob flex-1"
              style={{ color: config.color }}
              min={isDrum ? 20 : 100}
              max={isDrum ? 500 : 2000}
              step={isDrum ? 5 : 10}
              value={config.pitch}
              onChange={(e) => onParamChange(trackIndex, 'pitch', Number(e.target.value))}
              title={`${isDrum ? 'Tune' : 'Pitch'}: ${Math.round(config.pitch)} Hz`}
              aria-label={`${config.label} ${isDrum ? 'tune' : 'pitch'}`}
            />
          </div>
        </>
      ) : (
        /* Locked track */
        <div className="flex items-center gap-1.5">
          <div
            className="shrink-0 rounded-full"
            style={{ width: 5, height: 5, backgroundColor: 'var(--border-mid)' }}
          />
          <span
            className="font-mono uppercase"
            style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--ink-mute)' }}
          >
            Locked
          </span>
        </div>
      )}
    </div>
  );
});
