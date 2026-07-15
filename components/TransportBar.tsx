'use client';

import { memo } from 'react';

interface TransportBarProps {
  isPlaying: boolean;
  bpm: number;
  isRecording: boolean;
  recordingDuration: number;
  onTogglePlay: () => void;
  onSetTempo: (bpm: number) => void;
  onRandomize: () => void;
  onToggleRecording: () => void;
}

export const TransportBar = memo(function TransportBar({
  isPlaying,
  bpm,
  isRecording,
  recordingDuration,
  onTogglePlay,
  onSetTempo,
  onRandomize,
  onToggleRecording,
}: TransportBarProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">

      {/* Play / Stop */}
      <button
        id="btn-play-stop"
        className={['hw-btn', isPlaying ? 'hw-btn-rust' : 'hw-btn-amber'].join(' ')}
        style={{ minWidth: 88, fontSize: '12px', letterSpacing: '0.16em' }}
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Stop sequencer' : 'Play sequencer'}
      >
        {isPlaying ? 'Stop' : 'Play'}
      </button>

      {/* BPM */}
      <div
        className="hw-panel-inset flex items-center gap-1 px-2 py-1.5"
        style={{ gap: 6 }}
      >
        <button
          className="hw-btn hw-btn-ghost"
          style={{ padding: '4px 8px', fontSize: '14px', lineHeight: 1, minWidth: 0 }}
          onClick={() => onSetTempo(Math.max(40, bpm - 1))}
          aria-label="Decrease BPM"
        >
          &minus;
        </button>

        <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
          <input
            type="number"
            id="bpm-input"
            className="lcd-text bg-transparent text-center outline-none w-full border-none"
            style={{ fontSize: '1.4rem', width: 56 }}
            value={bpm}
            min={40}
            max={240}
            onChange={(e) => onSetTempo(Number(e.target.value))}
            aria-label="BPM"
          />
          <span
            className="font-mono uppercase"
            style={{ fontSize: '8px', letterSpacing: '0.25em', color: 'var(--ink-mute)' }}
          >
            BPM
          </span>
        </div>

        <button
          className="hw-btn hw-btn-ghost"
          style={{ padding: '4px 8px', fontSize: '14px', lineHeight: 1, minWidth: 0 }}
          onClick={() => onSetTempo(Math.min(240, bpm + 1))}
          aria-label="Increase BPM"
        >
          +
        </button>
      </div>

      {/* Randomize */}
      <button
        id="btn-randomize"
        className="hw-btn hw-btn-ghost"
        onClick={onRandomize}
        aria-label="Generate random pattern"
      >
        Random
      </button>

      {/* Record */}
      <button
        id="btn-record"
        className={[
          'hw-btn',
          isRecording ? 'hw-btn-rust' : 'hw-btn-ghost',
          isRecording ? 'animate-[ledFastPulse_0.7s_ease-in-out_infinite]' : '',
        ].join(' ')}
        onClick={onToggleRecording}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording
          ? `Rec  ${recordingDuration}s`
          : 'Rec'}
      </button>
    </div>
  );
});
