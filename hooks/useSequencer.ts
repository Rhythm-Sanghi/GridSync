'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GridState,
  TrackConfig,
  CellAuthorship,
} from '@/lib/types';
import { Sequencer, createSequencer } from '@/lib/audio/scheduler';
import { resumeAudioContext } from '@/lib/audio/audioContext';
import { DEFAULT_BPM, STEP_COUNT, makeEmptyGrid, makeEmptyAuthorship } from '@/lib/constants';

export interface UseSequencerReturn {
  grid: GridState;
  cellAuthorship: CellAuthorship;
  trackConfigs: TrackConfig[];
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  audioReady: boolean;
  kickPulse: boolean;

  // Actions
  togglePlay: () => void;
  /** Start sequencer locked to host's beat grid */
  startSynced: (startAtHostTime: number, startBeat: number, bpm: number, receivedAt: number) => void;
  /** Stop sequencer and reset visual step */
  stopAll: () => void;
  toggleStep: (track: number, step: number, peerId?: string) => void;
  setTempo: (bpm: number) => void;
  setGrid: (grid: GridState, authorship: CellAuthorship) => void;
  setTrackConfigs: (configs: TrackConfig[]) => void;
  updateTrackParam: (track: number, param: string, value: number | string | boolean) => void;
  initAudio: () => Promise<void>;
}

export function useSequencer(
  initialGrid?: GridState,
  initialTrackConfigs?: TrackConfig[],
  initialBpm?: number,
): UseSequencerReturn {
  const [grid, setGridState] = useState<GridState>(initialGrid ?? makeEmptyGrid());
  const [cellAuthorship, setCellAuthorship] = useState<CellAuthorship>(makeEmptyAuthorship());
  const [trackConfigs, setTrackConfigsState] = useState<TrackConfig[]>(initialTrackConfigs ?? []);
  const [bpm, setBpm] = useState(initialBpm ?? DEFAULT_BPM);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [kickPulse, setKickPulse] = useState(false);

  const sequencerRef = useRef<Sequencer | null>(null);
  const gridRef = useRef(grid);
  const trackConfigsRef = useRef(trackConfigs);
  const kickPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync for the scheduler (avoids stale closures)
  gridRef.current = grid;
  trackConfigsRef.current = trackConfigs;

  const initAudio = useCallback(async () => {
    await resumeAudioContext();
    setAudioReady(true);
  }, []);

  // Create the sequencer when track configs are first available
  useEffect(() => {
    if (trackConfigs.length === 0) return;

    const seq = createSequencer(
      bpm,
      STEP_COUNT,
      gridRef.current,
      trackConfigsRef.current,
      {
        onStep: (stepIndex) => setCurrentStep(stepIndex),
        onKick: () => {
          setKickPulse(true);
          if (kickPulseTimerRef.current) clearTimeout(kickPulseTimerRef.current);
          kickPulseTimerRef.current = setTimeout(() => setKickPulse(false), 80);
        },
      },
    );
    sequencerRef.current = seq;

    return () => {
      seq.stop();
    };
  }, [trackConfigs.length]); // only recreate when track count changes

  // Keep sequencer's internal references in sync
  useEffect(() => {
    sequencerRef.current?.updateGrid(grid);
  }, [grid]);

  useEffect(() => {
    sequencerRef.current?.updateTrackConfigs(trackConfigs);
  }, [trackConfigs]);

  useEffect(() => {
    sequencerRef.current?.setTempo(bpm);
  }, [bpm]);

  const togglePlay = useCallback(async () => {
    if (!audioReady) {
      await initAudio();
    }
    const seq = sequencerRef.current;
    if (!seq) return;

    if (seq.isPlaying) {
      seq.stop();
      setIsPlaying(false);
      setCurrentStep(0);
    } else {
      seq.start();
      setIsPlaying(true);
    }
  }, [audioReady, initAudio]);

  /**
   * Start sequencer synchronized to the host's audio clock.
   * Called by the room page when it receives a PLAY message from the network.
   */
  const startSynced = useCallback(
    async (startAtHostTime: number, startBeat: number, bpm: number, receivedAt: number) => {
      if (!audioReady) {
        await initAudio();
      }
      const seq = sequencerRef.current;
      if (!seq) return;
      seq.startSynced(startAtHostTime, startBeat, bpm, receivedAt);
      setIsPlaying(true);
    },
    [audioReady, initAudio],
  );

  /**
   * Stop sequencer and reset visual step counter.
   * Called by the room page when it receives a STOP message from the network.
   */
  const stopAll = useCallback(() => {
    const seq = sequencerRef.current;
    if (!seq) return;
    seq.stop();
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const toggleStep = useCallback((track: number, step: number, peerId: string = 'local') => {
    setGridState((prev) => {
      const newGrid = prev.map((row) => [...row]);
      newGrid[track][step] = !newGrid[track][step];
      // Update authorship
      setCellAuthorship((prevAuth) => {
        const newAuth = prevAuth.map((row) => [...row]);
        newAuth[track][step] = newGrid[track][step] ? peerId : null;
        return newAuth;
      });
      return newGrid;
    });
  }, []);

  const setGrid = useCallback((newGrid: GridState, newAuthorship: CellAuthorship) => {
    setGridState(newGrid);
    setCellAuthorship(newAuthorship);
  }, []);

  const setTrackConfigs = useCallback((configs: TrackConfig[]) => {
    setTrackConfigsState(configs);
  }, []);

  const setTempo = useCallback((newBpm: number) => {
    setBpm(Math.max(40, Math.min(240, newBpm)));
  }, []);

  const updateTrackParam = useCallback(
    (track: number, param: string, value: number | string | boolean) => {
      setTrackConfigsState((prev) =>
        prev.map((c, i) => (i === track ? { ...c, [param]: value } : c)),
      );
    },
    [],
  );

  // Cleanup kick pulse timer on unmount
  useEffect(() => {
    return () => {
      if (kickPulseTimerRef.current) clearTimeout(kickPulseTimerRef.current);
    };
  }, []);

  return {
    grid,
    cellAuthorship,
    trackConfigs,
    bpm,
    isPlaying,
    currentStep,
    audioReady,
    kickPulse,
    togglePlay,
    startSynced,
    stopAll,
    toggleStep,
    setTempo,
    setGrid,
    setTrackConfigs,
    updateTrackParam,
    initAudio,
  };
}
