"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Phase =
  | "playing-tts"
  | "recording"
  | "uploading"
  | "upload-failed"
  | "done";

interface Props {
  ttsAudioUrl: string;
  maxDurationSeconds: number;
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

// AudioContext로 TTS 재생 (autoplay 정책 우회)
async function playTtsViaContext(url: string): Promise<void> {
  try {
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    const ctx = new AudioContext();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(ctx.destination);

    return new Promise((resolve) => {
      // 안전장치: TTS 길이 + 3초 후에도 onended 안 불리면 강제 resolve
      const fallbackMs = (audioBuf.duration + 3) * 1000;
      const fallbackTimer = setTimeout(() => {
        ctx.close().catch(() => {});
        resolve();
      }, fallbackMs);

      source.onended = () => {
        clearTimeout(fallbackTimer);
        ctx.close().catch(() => {});
        resolve();
      };
      source.start();
    });
  } catch (err) {
    console.warn("TTS playback failed:", err);
  }
}

export default function Recorder({
  ttsAudioUrl,
  maxDurationSeconds,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("playing-tts");
  const [recordedSec, setRecordedSec] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mimeTypeRef = useRef<string>(getSupportedMimeType());
  const startedRef = useRef(false);
  const lastBlobRef = useRef<Blob | null>(null);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const retryUpload = useCallback(async () => {
    if (!lastBlobRef.current) return;
    setPhase("uploading");
    setUploadError("");
    try {
      await onComplete(lastBlobRef.current, mimeTypeRef.current);
      setPhase("done");
    } catch (err) {
      console.error("Retry failed:", err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setPhase("upload-failed");
    }
  }, [onComplete]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      console.error("Failed to get mic stream for recording");
      return;
    }

    // 녹음 시작 시 아바타 영상 첫 프레임으로 정지
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    playBeep();

    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, {
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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      lastBlobRef.current = blob;
      setPhase("uploading");
      try {
        await onComplete(blob, mimeTypeRef.current);
        setPhase("done");
      } catch (err) {
        console.error("Upload failed:", err);
        setUploadError(err instanceof Error ? err.message : "Upload failed");
        setPhase("upload-failed");
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
  }, [maxDurationSeconds, onComplete, stopRecording]);

  // 마운트 시 TTS 재생(AudioContext) → 끝나면 녹음 시작
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      if (ttsAudioUrl) {
        await playTtsViaContext(ttsAudioUrl);
      }
      setTimeout(() => startRecording(), 300);
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "playing-tts") {
    return (
      <div className="flex flex-col items-center py-4">
        <video
          ref={videoRef}
          src="/interview-avatar.mp4"
          muted
          playsInline
          loop
          autoPlay
          className="w-[120px] h-[150px] object-cover rounded-xl mb-4"
        />
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-gray-700 text-[15px]">Listening... / Dang nghe...</span>
        </div>
      </div>
    );
  }

  if (phase === "recording") {
    const remaining = maxDurationSeconds - recordedSec;
    const pct = (recordedSec / maxDurationSeconds) * 100;
    return (
      <div>
        <div className="flex justify-center mb-4">
          <video
            ref={videoRef}
            src="/interview-avatar.mp4"
            muted
            playsInline
            className="w-[120px] h-[150px] object-cover rounded-xl"
          />
        </div>
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

  if (phase === "upload-failed") {
    return (
      <div className="text-center py-6">
        <p className="text-red-500 text-[14px] mb-2">
          {uploadError || "Upload failed"}
        </p>
        <p className="text-gray-500 text-[12px] mb-4">
          Please check your connection and try again. / Vui long kiem tra ket noi va thu lai.
        </p>
        <button
          onClick={retryUpload}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-[14px] hover:bg-blue-600 transition-colors duration-100"
        >
          Retry / Thu lai
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
