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
  const paramLabel = isDrum ? 'Tune' : 'Pitch';

  return (
    <div
      className="w-[72px] shrink-0 flex flex-col gap-1 px-1 py-0.5 select-none"
      style={{ color: config.color }}
    >
      {/* Track label + mute button */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-mono font-bold uppercase tracking-widest truncate"
          style={{ textShadow: `0 0 6px ${config.color}` }}
        >
          {config.unlocked ? config.label : '🔒'}
        </span>
        {config.unlocked && (
          <button
            className={[
              'text-[9px] font-bold rounded px-1 py-px transition-all',
              config.muted
                ? 'bg-white/10 text-white/30'
                : 'text-current opacity-60 hover:opacity-100',
            ].join(' ')}
            onClick={() => onParamChange(trackIndex, 'muted', !config.muted)}
            title={config.muted ? 'Unmute' : 'Mute'}
            aria-label={config.muted ? `Unmute ${config.label}` : `Mute ${config.label}`}
          >
            {config.muted ? 'M' : '◆'}
          </button>
        )}
      </div>

      {/* Pitch / tune knob */}
      {config.unlocked && (
        <div className="flex flex-col gap-0.5">
          <input
            type="range"
            className="track-knob"
            style={{ color: config.color }}
            min={isDrum ? 20 : 100}
            max={isDrum ? 500 : 2000}
            step={isDrum ? 5 : 10}
            value={config.pitch}
            onChange={(e) =>
              onParamChange(trackIndex, 'pitch', Number(e.target.value))
            }
            title={`${paramLabel}: ${Math.round(config.pitch)} Hz`}
            aria-label={`${config.label} ${paramLabel}`}
          />
        </div>
      )}
    </div>
  );
});
