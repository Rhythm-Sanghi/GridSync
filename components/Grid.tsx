'use client';

import React, { memo, useCallback } from 'react';
import { GridState, TrackConfig, CellAuthorship } from '@/lib/types';

interface GridProps {
  grid: GridState;
  trackConfigs: TrackConfig[];
  cellAuthorship: CellAuthorship;
  currentStep: number;
  isPlaying: boolean;
  myPeerId: string | null;
  peerColors: Record<string, string>; // peerId → color
  onToggleStep: (track: number, step: number) => void;
}

const STEP_COUNT = 16;

/** Returns a hex color with reduced opacity for cell background */
function hexWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// Beat grouping — steps are visually grouped in sets of 4 (one quarter note each)
function getBeatGroup(stepIndex: number): number {
  return Math.floor(stepIndex / 4);
}

const StepCell = memo(function StepCell({
  active,
  isCurrentStep,
  isPlaying,
  trackColor,
  authorColor,
  trackUnlocked,
  onToggle,
}: {
  active: boolean;
  isCurrentStep: boolean;
  isPlaying: boolean;
  trackColor: string;
  authorColor: string | null;
  trackUnlocked: boolean;
  onToggle: () => void;
}) {
  const displayColor = active ? (authorColor ?? trackColor) : trackColor;

  const cellStyle: React.CSSProperties = active
    ? {
        backgroundColor: hexWithOpacity(displayColor, 0.75),
        borderColor: displayColor,
        boxShadow: `0 0 10px ${hexWithOpacity(displayColor, 0.6)}, inset 0 0 6px ${hexWithOpacity(displayColor, 0.3)}`,
      }
    : isCurrentStep && isPlaying
    ? {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.25)',
      }
    : {};

  return (
    <button
      className={[
        'step-cell flex-1',
        active ? 'active' : '',
        isCurrentStep && isPlaying ? 'playing-column' : '',
        !trackUnlocked ? 'locked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={cellStyle}
      onClick={trackUnlocked ? onToggle : undefined}
      aria-label={active ? 'Active step' : 'Inactive step'}
      aria-pressed={active}
    />
  );
});

export const Grid = memo(function Grid({
  grid,
  trackConfigs,
  cellAuthorship,
  currentStep,
  isPlaying,
  myPeerId,
  peerColors,
  onToggleStep,
}: GridProps) {
  const handleToggle = useCallback(
    (track: number, step: number) => {
      onToggleStep(track, step);
    },
    [onToggleStep],
  );

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-[480px]">
        {/* Step index labels */}
        <div className="flex gap-0.5 mb-1 pl-[72px] pr-1">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <div
              key={i}
              className={[
                'flex-1 text-center text-xs font-mono transition-colors duration-75',
                currentStep === i && isPlaying
                  ? 'text-white'
                  : (i % 4 === 0 ? 'text-white/30' : 'text-white/10'),
              ].join(' ')}
            >
              {i % 4 === 0 ? i / 4 + 1 : '·'}
            </div>
          ))}
        </div>

        {/* Track rows */}
        {trackConfigs.map((config, trackIndex) => {
          const trackGrid = grid[trackIndex] ?? Array(STEP_COUNT).fill(false);
          const trackAuth = cellAuthorship[trackIndex] ?? Array(STEP_COUNT).fill(null);

          return (
            <div key={config.id} className="flex items-center gap-0.5 mb-1">
              {/* Track label (handled by TrackHeader, here just a spacer) */}
              <div className="w-[72px] shrink-0" />

              {/* Steps with beat-group visual separation */}
              {Array.from({ length: STEP_COUNT }, (_, stepIndex) => {
                const beatGroup = getBeatGroup(stepIndex);
                const active = trackGrid[stepIndex] ?? false;
                const authorPeerId = trackAuth[stepIndex];
                const authorColor = authorPeerId ? (peerColors[authorPeerId] ?? null) : null;

                return (
                  <React.Fragment key={stepIndex}>
                    {stepIndex > 0 && stepIndex % 4 === 0 && (
                      <div className="w-px h-full bg-white/5 mx-0.5 shrink-0" />
                    )}
                    <StepCell
                      active={active}
                      isCurrentStep={currentStep === stepIndex}
                      isPlaying={isPlaying}
                      trackColor={config.color}
                      authorColor={authorColor}
                      trackUnlocked={config.unlocked}
                      onToggle={() => handleToggle(trackIndex, stepIndex)}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}

        {/* Beat position indicator dots */}
        <div className="flex gap-0.5 mt-2 pl-[72px] pr-1">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <div
              key={i}
              className={[
                'beat-dot flex-1',
                currentStep === i && isPlaying ? 'active' : '',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
