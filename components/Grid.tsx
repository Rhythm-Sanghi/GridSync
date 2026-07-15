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
  peerColors: Record<string, string>;
  onToggleStep: (track: number, step: number) => void;
}

const STEP_COUNT = 16;

function hexWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
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
        backgroundColor: displayColor,
        boxShadow: [
          'inset 0 1px 0 rgba(255,230,180,0.22)',
          'inset 0 -1px 0 rgba(0,0,0,0.28)',
          `0 0 9px ${hexWithOpacity(displayColor, 0.32)}`,
          `0 0 2px ${hexWithOpacity(displayColor, 0.55)}`,
        ].join(', '),
      }
    : isCurrentStep && isPlaying
    ? {
        backgroundColor: 'rgba(255,200,100,0.05)',
        borderColor: 'rgba(255,200,100,0.16)',
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
    <div className="w-full overflow-x-auto pb-1">
      <div className="min-w-[480px]">
        {/* Beat number labels */}
        <div className="flex mb-1" style={{ paddingLeft: '72px' }}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <React.Fragment key={i}>
              {i > 0 && i % 4 === 0 && <div style={{ width: 7 }} />}
              <div
                className="flex-1 text-center font-mono"
                style={{
                  fontSize: '9px',
                  color: currentStep === i && isPlaying
                    ? 'var(--amber-hot)'
                    : i % 4 === 0
                    ? 'var(--ink-mute)'
                    : 'var(--border-warm)',
                  transition: 'color 0.05s',
                }}
              >
                {i % 4 === 0 ? String(i / 4 + 1) : '·'}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Track rows */}
        {trackConfigs.map((config, trackIndex) => {
          const trackGrid = grid[trackIndex] ?? Array(STEP_COUNT).fill(false);
          const trackAuth = cellAuthorship[trackIndex] ?? Array(STEP_COUNT).fill(null);

          return (
            <div key={config.id} className="flex items-center mb-1">
              {/* Spacer for track headers (rendered separately) */}
              <div style={{ width: 72, flexShrink: 0 }} />

              {/* Cells with beat-group separators */}
              {Array.from({ length: STEP_COUNT }, (_, stepIndex) => {
                const active = trackGrid[stepIndex] ?? false;
                const authorPeerId = trackAuth[stepIndex];
                const authorColor = authorPeerId ? (peerColors[authorPeerId] ?? null) : null;

                return (
                  <React.Fragment key={stepIndex}>
                    {stepIndex > 0 && stepIndex % 4 === 0 && (
                      <div
                        style={{
                          width: 1,
                          alignSelf: 'stretch',
                          background: 'var(--border-mid)',
                          margin: '0 3px',
                          flexShrink: 0,
                        }}
                      />
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

        {/* Beat position dots */}
        <div className="flex mt-2" style={{ paddingLeft: '72px' }}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <React.Fragment key={i}>
              {i > 0 && i % 4 === 0 && <div style={{ width: 7 }} />}
              <div className="flex-1 flex justify-center">
                <div
                  className={['beat-dot', currentStep === i && isPlaying ? 'active' : ''].join(' ')}
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
});
