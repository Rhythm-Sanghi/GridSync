'use client';

import { useState, useCallback, useRef } from 'react';
import { getRecordingDestination } from '@/lib/audio/audioContext';

export interface UseExportReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: (canvasRef: HTMLCanvasElement) => void;
  stopRecording: () => void;
}

export function useExport(): UseExportReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const startRecording = useCallback((canvas: HTMLCanvasElement) => {
    if (isRecording) return;

    const audioDest = getRecordingDestination();
    const canvasStream = canvas.captureStream(30); // 30fps

    let combinedStream: MediaStream;

    if (audioDest && typeof MediaRecorder !== 'undefined') {
      // Combine canvas video + audio
      const audioTrack = audioDest.stream.getAudioTracks()[0];
      const videoTrack = canvasStream.getVideoTracks()[0];
      combinedStream = new MediaStream([videoTrack, audioTrack].filter(Boolean));
    } else {
      combinedStream = canvasStream;
    }

    // Prefer WebM/Opus, fall back to whatever is supported
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

    const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : {});
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gridsync-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setRecordingDuration(0);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100); // collect data every 100ms
    setIsRecording(true);
    startTimeRef.current = Date.now();

    // Update duration display
    timerRef.current = setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  return { isRecording, recordingDuration, startRecording, stopRecording };
}
