"use client";

import { useState, useRef } from "react";

function getSupportedMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export default function IntroPage({ params }: { params: { code: string } }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 사운드 테스트
  const [soundOk, setSoundOk] = useState(false);
  const [soundPlaying, setSoundPlaying] = useState(false);

  // 마이크 테스트
  const [micPhase, setMicPhase] = useState<"idle" | "recording" | "playback" | "done">("idle");
  const [testSec, setTestSec] = useState(0);

  const testStreamRef = useRef<MediaStream | null>(null);
  const testRecorderRef = useRef<MediaRecorder | null>(null);
  const testChunksRef = useRef<Blob[]>([]);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);
  const testAudioUrlRef = useRef<string>("");

  // === 사운드 테스트 ===
  const playSoundTest = () => {
    setSoundPlaying(true);
    try {
      const ctx = new AudioContext();
      const notes = [523, 659, 784];
      for (let i = 0; i < notes.length; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = notes[i];
        gain.gain.value = 0.25;
        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.2);
      }
      setTimeout(() => {
        ctx.close();
        setSoundPlaying(false);
      }, 1000);
    } catch {
      setSoundPlaying(false);
    }
  };

  // === 마이크 테스트 ===
  const startMicTest = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStreamRef.current = stream;
    } catch (err) {
      console.error("Mic error:", err);
      setError(
        "Microphone access was blocked.\n\n" +
        "How to fix:\n" +
        "• Chrome/Arc: Click the lock icon (left of address bar) → Set Microphone to \"Allow\" → Reload\n" +
        "• Safari: Settings → Websites → Microphone → Allow\n\n" +
        "Cach khac phuc: Nhan bieu tuong o khoa → Cho phep Micro → Tai lai trang"
      );
      return;
    }

    const mime = getSupportedMimeType();
    if (!mime) {
      setError("Your browser does not support audio recording.");
      return;
    }

    setMicPhase("recording");
    setTestSec(5);
    testChunksRef.current = [];

    const recorder = new MediaRecorder(testStreamRef.current!, { mimeType: mime });
    testRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) testChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      testStreamRef.current?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(testChunksRef.current, { type: mime });
      testAudioUrlRef.current = URL.createObjectURL(blob);
      setMicPhase("playback");
    };

    recorder.start();

    let sec = 5;
    testTimerRef.current = setInterval(() => {
      sec -= 1;
      setTestSec(sec);
      if (sec <= 0) {
        clearInterval(testTimerRef.current!);
        if (recorder.state === "recording") recorder.stop();
      }
    }, 1000);
  };

  const stopTestEarly = () => {
    if (testTimerRef.current) clearInterval(testTimerRef.current);
    if (testRecorderRef.current?.state === "recording") {
      testRecorderRef.current.stop();
    }
  };

  const confirmMic = () => {
    if (testAudioUrlRef.current) URL.revokeObjectURL(testAudioUrlRef.current);
    setMicPhase("done");
  };

  const retryMic = () => {
    if (testAudioUrlRef.current) URL.revokeObjectURL(testAudioUrlRef.current);
    setMicPhase("idle");
  };

  const allTestsPassed = soundOk && micPhase === "done";

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!agreed) { setError("Please agree to the terms."); return; }
    if (!allTestsPassed) { setError("Please complete both audio tests first."); return; }

    setLoading(true);

    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: params.code,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to start.");
        setLoading(false);
        return;
      }
      window.location.href = `/interview/${params.code}/question`;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-[640px] mx-auto bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-8">
        <h1 className="text-[22px] font-medium text-gray-900 mb-2">Welcome / Chao mung</h1>
        <p className="text-gray-500 mb-6 text-[14px]">Code: <span className="font-mono font-medium">{params.code}</span></p>

        <div className="bg-blue-50 border-[0.5px] border-blue-500/20 rounded-xl p-4 mb-6 text-[13px] text-gray-700">
          <p className="font-medium mb-2">How it works:</p>
          <ul className="list-disc list-inside space-y-1 mb-3">
            <li>7 questions (mix of English and Vietnamese)</li>
            <li>Each question is hidden until you tap &quot;Start&quot;</li>
            <li>After tapping, the question appears and is read aloud</li>
            <li>A beep sounds, then recording starts automatically</li>
            <li>45-90 seconds per question — you can submit early</li>
            <li>Quiet environment with working microphone needed</li>
            <li>Do NOT close or refresh the page during the interview</li>
          </ul>
          <p className="font-medium mb-2">Quy trinh:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>7 cau hoi (ket hop tieng Anh va tieng Viet)</li>
            <li>Cau hoi se bi an cho den khi ban nhan &quot;Start&quot;</li>
            <li>Sau khi nhan, cau hoi hien thi va duoc doc to</li>
            <li>Tieng bip vang len, ghi am bat dau tu dong</li>
            <li>45-90 giay moi cau — co the nop som</li>
            <li>Can moi truong yen tinh va micro hoat dong</li>
            <li>KHONG dong hoac lam moi trang khi dang phong van</li>
          </ul>
        </div>

        {/* 테스트 섹션 */}
        <div className="space-y-3 mb-6">
          {/* 1. 사운드 테스트 */}
          <div className="border-[0.5px] border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[12px] flex items-center justify-center font-medium">1</span>
                <span className="text-[13px] font-medium text-gray-700">Speaker Test / Kiem tra loa</span>
              </div>
              {soundOk && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
            {!soundOk && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={playSoundTest}
                  disabled={soundPlaying}
                  className="flex-1 py-2.5 bg-gray-100 rounded-xl text-[13px] text-gray-700 hover:bg-gray-200 transition-colors duration-100 disabled:opacity-50"
                >
                  {soundPlaying ? "Playing..." : "Play Sound / Phat am thanh"}
                </button>
                <button
                  type="button"
                  onClick={() => setSoundOk(true)}
                  className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-[13px] hover:bg-blue-600 transition-colors duration-100"
                >
                  I can hear it / Toi nghe duoc
                </button>
              </div>
            )}
          </div>

          {/* 2. 마이크 테스트 */}
          <div className="border-[0.5px] border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[12px] flex items-center justify-center font-medium">2</span>
                <span className="text-[13px] font-medium text-gray-700">Microphone Test / Kiem tra micro</span>
              </div>
              {micPhase === "done" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>

            {micPhase === "idle" && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={startMicTest}
                  className="w-full py-2.5 bg-gray-100 rounded-xl text-[13px] text-gray-700 hover:bg-gray-200 transition-colors duration-100 flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>
                  Record 5 seconds / Ghi am 5 giay
                </button>
              </div>
            )}

            {micPhase === "recording" && (
              <div className="mt-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-500 font-medium text-[14px]">Recording... {testSec}s</span>
                </div>
                <p className="text-gray-500 text-[12px] mb-3">Say something! / Hay noi gi do!</p>
                <button
                  type="button"
                  onClick={stopTestEarly}
                  className="px-6 py-2 bg-gray-900 text-white rounded-xl text-[13px] hover:bg-gray-800 transition-colors duration-100"
                >
                  Done / Xong
                </button>
              </div>
            )}

            {micPhase === "playback" && (
              <div className="mt-3">
                <p className="text-[12px] text-gray-500 mb-2">Listen to your recording: / Nghe lai:</p>
                <audio controls src={testAudioUrlRef.current} className="w-full h-10 mb-3" />
                <div className="flex gap-2">
                  <button type="button" onClick={retryMic}
                    className="flex-1 py-2.5 bg-gray-100 rounded-xl text-[13px] text-gray-700 hover:bg-gray-200 transition-colors duration-100">
                    Retry / Thu lai
                  </button>
                  <button type="button" onClick={confirmMic}
                    className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-[13px] hover:bg-blue-600 transition-colors duration-100">
                    Sounds good / Nghe tot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Full Name / Ho va ten <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border-[0.5px] border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[14px]" required />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border-[0.5px] border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[14px]" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Phone / So dien thoai</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border-[0.5px] border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[14px]" />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span className="text-[13px] text-gray-700">
              I confirm I will complete this interview by myself, without external help (AI tools, other people, or pre-written scripts).
              <br /><em className="text-gray-500">Toi xac nhan se hoan thanh buoi phong van nay mot minh, khong co su tro giup tu ben ngoai.</em>
            </span>
          </label>

          {error && <div className="text-red-500 text-[13px] bg-red-400/10 px-3 py-2 rounded-xl whitespace-pre-line">{error}</div>}

          <button type="submit" disabled={loading || !allTestsPassed}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-colors duration-100">
            {loading ? "Starting..." : "Start Interview / Bat dau"}
          </button>
        </form>
      </div>
    </div>
  );
}
