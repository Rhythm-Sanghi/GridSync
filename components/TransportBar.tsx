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
        className={[
          'btn-neon text-lg px-5 py-2.5 font-bold tracking-wide min-w-[100px]',
          isPlaying ? 'btn-neon-magenta' : 'btn-neon-cyan',
        ].join(' ')}
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Stop sequencer' : 'Play sequencer'}
      >
        {isPlaying ? '⏹ STOP' : '▶ PLAY'}
      </button>

      {/* BPM Control */}
      <div className="flex items-center gap-2 glass-card px-3 py-1.5">
        <button
          className="text-white/50 hover:text-white text-lg leading-none transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
          onClick={() => onSetTempo(bpm - 1)}
          aria-label="Decrease BPM"
        >
          −
        </button>
        <div className="flex flex-col items-center">
          <input
            type="number"
            id="bpm-input"
            className="w-14 text-center bg-transparent text-neon-cyan font-mono font-bold text-xl outline-none border-b border-neon-cyan/30 focus:border-neon-cyan/70 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={bpm}
            min={40}
            max={240}
            onChange={(e) => onSetTempo(Number(e.target.value))}
            aria-label="BPM"
          />
          <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">BPM</span>
        </div>
        <button
          className="text-white/50 hover:text-white text-lg leading-none transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
          onClick={() => onSetTempo(bpm + 1)}
          aria-label="Increase BPM"
        >
          +
        </button>
      </div>

      {/* Randomize */}
      <button
        id="btn-randomize"
        className="btn-neon btn-neon-lime"
        onClick={onRandomize}
        aria-label="Generate random pattern"
      >
        🎲 RANDOM
      </button>

      {/* Record / Export */}
      <button
        id="btn-record"
        className={[
          'btn-neon',
          isRecording ? 'btn-neon-magenta animate-pulse' : 'btn-neon-white',
        ].join(' ')}
        onClick={onToggleRecording}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <span>⏺ {recordingDuration}s REC</span>
        ) : (
          <span>📹 REC</span>
        )}
      </button>
    </div>
  );
});
