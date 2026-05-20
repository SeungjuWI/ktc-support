"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Phase =
  | "playing-tts"
  | "recording"
  | "uploading"
  | "done";

interface Props {
  ttsAudioUrl: string;
  maxDurationSeconds: number;
  stream: MediaStream;
  onComplete: (audioBlob: Blob, mimeType: string) => Promise<void>;
}

function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 300);
  } catch {
    // ignore
  }
}

export default function Recorder({
  ttsAudioUrl,
  maxDurationSeconds,
  stream,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("playing-tts");
  const [recordedSec, setRecordedSec] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mimeTypeRef = useRef<string>(getSupportedMimeType());
  const startedRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(() => {
    playBeep();

    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: mimeTypeRef.current,
      });
    } catch (err) {
      console.error("MediaRecorder init failed:", err);
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      setPhase("uploading");
      try {
        await onComplete(blob, mimeTypeRef.current);
        setPhase("done");
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed. Please refresh the page and try again.");
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setPhase("recording");
    setRecordedSec(0);

    timerRef.current = setInterval(() => {
      setRecordedSec((s) => {
        const next = s + 1;
        if (next >= maxDurationSeconds) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  }, [maxDurationSeconds, onComplete, stopRecording, stream]);

  // 마운트 시 TTS 자동재생 → 끝나면 녹음 시작
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const audio = new Audio(ttsAudioUrl);
    audioRef.current = audio;

    const onTtsEnd = () => {
      setTimeout(() => startRecording(), 300);
    };

    audio.onended = onTtsEnd;
    audio.onerror = () => {
      console.warn("TTS playback failed");
      onTtsEnd();
    };

    audio.play().catch(() => {
      console.warn("Audio autoplay blocked");
      onTtsEnd();
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioRef.current?.pause();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "playing-tts") {
    return (
      <div className="flex items-center justify-center gap-3 py-4">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-gray-700 text-[15px]">Listening... / Dang nghe...</span>
      </div>
    );
  }

  if (phase === "recording") {
    const remaining = maxDurationSeconds - recordedSec;
    const pct = (recordedSec / maxDurationSeconds) * 100;
    return (
      <div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
          <div className="bg-red-400 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}></div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-500 font-medium text-[14px]">REC</span>
          </div>
          <span className="font-mono text-[24px] font-medium text-gray-900">
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
          </span>
        </div>
        <button
          onClick={stopRecording}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-colors duration-100 text-[14px]"
        >
          Submit Answer / Nop cau tra loi
        </button>
      </div>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="text-center py-6">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-600 text-[14px]">Processing... / Dang xu ly...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <p className="text-gray-600 text-[14px]">Moving to next question...</p>
    </div>
  );
}
