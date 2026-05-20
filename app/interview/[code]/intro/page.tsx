"use client";

import { useState, useRef, useEffect } from "react";

function getSupportedMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

type Step = "info" | "welcome" | "guide" | "speaker" | "mic" | "ready";

export default function IntroPage({ params }: { params: { code: string } }) {
  const [step, setStep] = useState<Step>("info");

  // 개인정보
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [appliedCompany, setAppliedCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  // 확인 모달
  const [showConfirm, setShowConfirm] = useState(false);

  // 코드 유효성 체크 + 자동 입력
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/interview/validate?code=${encodeURIComponent(params.code)}`);
        const json = await res.json();
        if (!json.success) {
          setExpired(true);
          return;
        }
        if (json.prefill) {
          if (json.prefill.name) setName(json.prefill.name);
          if (json.prefill.email) setEmail(json.prefill.email);
          if (json.prefill.appliedCompany) setAppliedCompany(json.prefill.appliedCompany);
        }
      } catch {
        // 네트워크 에러는 무시
      }
    })();
  }, [params.code]);

  // 사운드 테스트
  const [soundPlaying, setSoundPlaying] = useState(false);

  // 마이크 테스트
  const [micPhase, setMicPhase] = useState<"idle" | "recording" | "playback" | "done">("idle");
  const [testSec, setTestSec] = useState(0);

  const testStreamRef = useRef<MediaStream | null>(null);
  const testRecorderRef = useRef<MediaRecorder | null>(null);
  const testChunksRef = useRef<Blob[]>([]);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);
  const testAudioUrlRef = useRef<string>("");

  // === 가이드 스텝용 ===
  const guideItems = [
    { en: "7 questions (mix of English and Vietnamese)", vi: "7 cau hoi (ket hop tieng Anh va tieng Viet)" },
    { en: "Each question is hidden until you tap \"Start\"", vi: "Cau hoi se bi an cho den khi ban nhan \"Start\"" },
    { en: "After tapping, the question appears and is read aloud", vi: "Sau khi nhan, cau hoi hien thi va duoc doc to" },
    { en: "A beep sounds, then recording starts automatically", vi: "Tieng bip vang len, ghi am bat dau tu dong" },
    { en: "45-90 seconds per question — you can submit early", vi: "45-90 giay moi cau — co the nop som" },
    { en: "Quiet environment with working microphone needed", vi: "Can moi truong yen tinh va micro hoat dong" },
    { en: "Do NOT close or refresh the page during the interview", vi: "KHONG dong hoac lam moi trang khi dang phong van" },
  ];

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
        "- Chrome/Arc: Click the lock icon (left of address bar) > Set Microphone to \"Allow\" > Reload\n" +
        "- Safari: Settings > Websites > Microphone > Allow\n\n" +
        "Cach khac phuc: Nhan bieu tuong o khoa > Cho phep Micro > Tai lai trang"
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
    setStep("ready");
  };

  const retryMic = () => {
    if (testAudioUrlRef.current) URL.revokeObjectURL(testAudioUrlRef.current);
    setMicPhase("idle");
  };

  // === 개인정보 제출 ===
  const handleInfoSubmit = () => {
    setError("");
    if (!name.trim()) { setError("Please enter your full name. / Vui long nhap ho ten."); return; }
    if (!email.trim()) { setError("Please enter your email. / Vui long nhap email."); return; }
    if (!appliedCompany.trim()) { setError("Please enter the company you applied to. / Vui long nhap cong ty ung tuyen."); return; }
    if (!phone.trim()) { setError("Please enter your phone number. / Vui long nhap so dien thoai."); return; }
    setStep("welcome");
  };

  // === 인터뷰 시작 ===
  const handleStart = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: params.code,
          name: name.trim(),
          email: email.trim(),
          appliedCompany: appliedCompany.trim(),
          phone: phone.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to start.");
        setLoading(false);
        setShowConfirm(false);
        return;
      }
      window.location.href = `/interview/${params.code}/question`;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      setShowConfirm(false);
    }
  };

  // === 만료 화면 ===
  if (expired) {
    return (
      <div className="min-h-[calc(100vh-57px)] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-10 text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F04452" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900 mb-3">Code Expired</h1>
          <p className="text-gray-600 text-[14px] mb-4">
            This access code has already been used or is no longer valid.
          </p>
          <p className="text-gray-500 text-[13px] mb-4">
            If you have any questions, please contact your recruiter.
          </p>
          <p className="text-gray-400 text-[12px] italic">
            Ma truy cap nay da duoc su dung hoac khong con hieu luc. Vui long lien he nguoi tuyen dung.
          </p>
        </div>
      </div>
    );
  }

  // === 스텝 인디케이터 ===
  const steps: { key: Step; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "welcome", label: "Welcome" },
    { key: "guide", label: "Guide" },
    { key: "speaker", label: "Speaker" },
    { key: "mic", label: "Mic" },
    { key: "ready", label: "Start" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                i < currentIdx ? "bg-[#1D9E75]" : i === currentIdx ? "bg-[#3182F6]" : "bg-[#E5E8EB]"
              }`} />
              {i < steps.length - 1 && (
                <div className={`w-4 h-[1px] transition-colors duration-200 ${
                  i < currentIdx ? "bg-[#1D9E75]" : "bg-[#E5E8EB]"
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border-[0.5px] border-[#E5E8EB]/60 p-8">

          {/* ====== STEP 1: 개인정보 입력 ====== */}
          {step === "info" && (
            <div>
              <h1 className="text-[22px] font-medium text-[#191F28] mb-1">Before we begin</h1>
              <p className="text-[#8B95A1] text-[14px] mb-6">
                Please enter your information to get started.
                <br />
                <span className="text-[13px]">Vui long nhap thong tin cua ban de bat dau.</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#4E5968] mb-1">
                    Full Name / Ho va ten <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyen Van A"
                    className="w-full px-3 py-2.5 border-[0.5px] border-[#E5E8EB] rounded-xl focus:ring-2 focus:ring-[#3182F6] outline-none text-[14px] text-[#191F28] placeholder:text-[#B0B8C1]" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#4E5968] mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2.5 border-[0.5px] border-[#E5E8EB] rounded-xl focus:ring-2 focus:ring-[#3182F6] outline-none text-[14px] text-[#191F28] placeholder:text-[#B0B8C1]" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#4E5968] mb-1">
                    Applied Company / Cong ty ung tuyen <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={appliedCompany} onChange={(e) => setAppliedCompany(e.target.value)}
                    placeholder="Company name"
                    className="w-full px-3 py-2.5 border-[0.5px] border-[#E5E8EB] rounded-xl focus:ring-2 focus:ring-[#3182F6] outline-none text-[14px] text-[#191F28] placeholder:text-[#B0B8C1]" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#4E5968] mb-1">
                    Phone / So dien thoai <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-3 py-2.5 border-[0.5px] border-[#E5E8EB] rounded-xl focus:ring-2 focus:ring-[#3182F6] outline-none text-[14px] text-[#191F28] placeholder:text-[#B0B8C1]" />
                </div>
              </div>

              {error && <div className="text-red-500 text-[13px] bg-red-400/10 px-3 py-2 rounded-xl mt-4 whitespace-pre-line">{error}</div>}

              <button onClick={handleInfoSubmit}
                className="w-full mt-6 bg-[#3182F6] hover:bg-[#2272EB] text-white py-3 rounded-xl font-medium transition-colors duration-100 text-[15px]">
                Next / Tiep tuc
              </button>
            </div>
          )}

          {/* ====== STEP 2: 환영 인사 ====== */}
          {step === "welcome" && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#E8F3FF] flex items-center justify-center mx-auto mb-5">
                <span className="text-[24px] text-[#3182F6] font-medium">
                  {name.trim().charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 className="text-[22px] font-medium text-[#191F28] mb-2">
                Hello, {name.trim().split(" ").pop()}!
              </h1>
              <p className="text-[#8B95A1] text-[14px] mb-1">
                Welcome to your AI interview.
              </p>
              <p className="text-[#B0B8C1] text-[13px] mb-8">
                Chao mung ban den voi buoi phong van AI.
              </p>

              <p className="text-[#6B7684] text-[14px] mb-8">
                Let me walk you through how it works before we start.
                <br />
                <span className="text-[13px] text-[#8B95A1]">Hay de toi huong dan cach thuc hoat dong truoc khi bat dau.</span>
              </p>

              <button onClick={() => setStep("guide")}
                className="w-full bg-[#3182F6] hover:bg-[#2272EB] text-white py-3 rounded-xl font-medium transition-colors duration-100 text-[15px]">
                Show me how / Huong dan toi
              </button>
            </div>
          )}

          {/* ====== STEP 3: 시험 방식 안내 ====== */}
          {step === "guide" && (
            <div>
              <h1 className="text-[22px] font-medium text-[#191F28] mb-1">How it works</h1>
              <p className="text-[#8B95A1] text-[14px] mb-6">Here&apos;s what to expect. / Day la nhung gi ban can biet.</p>

              <div className="space-y-3 mb-8">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-[#F2F4F6] text-[#6B7684] text-[12px] flex items-center justify-center font-medium shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[13px] text-[#333D4B] leading-relaxed">{item.en}</p>
                      <p className="text-[12px] text-[#B0B8C1] leading-relaxed">{item.vi}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setStep("speaker")}
                className="w-full bg-[#3182F6] hover:bg-[#2272EB] text-white py-3 rounded-xl font-medium transition-colors duration-100 text-[15px]">
                Got it, let&apos;s test devices / Da hieu, kiem tra thiet bi
              </button>
            </div>
          )}

          {/* ====== STEP 4: 스피커 테스트 ====== */}
          {step === "speaker" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#F2F4F6] flex items-center justify-center mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 010 7.07" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" />
                </svg>
              </div>
              <h1 className="text-[22px] font-medium text-[#191F28] mb-1">Speaker Test</h1>
              <p className="text-[#8B95A1] text-[14px] mb-1">
                Let&apos;s make sure you can hear audio.
              </p>
              <p className="text-[#B0B8C1] text-[13px] mb-8">
                Hay dam bao ban co the nghe duoc am thanh.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={playSoundTest}
                  disabled={soundPlaying}
                  className="w-full py-3 bg-[#F2F4F6] rounded-xl text-[14px] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors duration-100 disabled:opacity-50 font-medium"
                >
                  {soundPlaying ? "Playing... / Dang phat..." : "Play Sound / Phat am thanh"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("mic")}
                  className="w-full py-3 bg-[#3182F6] text-white rounded-xl text-[15px] hover:bg-[#2272EB] transition-colors duration-100 font-medium"
                >
                  I can hear it / Toi nghe duoc
                </button>
              </div>
            </div>
          )}

          {/* ====== STEP 5: 마이크 테스트 ====== */}
          {step === "mic" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#F2F4F6] flex items-center justify-center mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <h1 className="text-[22px] font-medium text-[#191F28] mb-1">Microphone Test</h1>
              <p className="text-[#8B95A1] text-[14px] mb-1">
                Record a short clip to check your mic.
              </p>
              <p className="text-[#B0B8C1] text-[13px] mb-8">
                Ghi am mot doan ngan de kiem tra micro.
              </p>

              {error && <div className="text-red-500 text-[13px] bg-red-400/10 px-3 py-2 rounded-xl mb-4 whitespace-pre-line text-left">{error}</div>}

              {micPhase === "idle" && (
                <button
                  type="button"
                  onClick={startMicTest}
                  className="w-full py-3 bg-[#F2F4F6] rounded-xl text-[14px] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors duration-100 font-medium flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>
                  Record 5 seconds / Ghi am 5 giay
                </button>
              )}

              {micPhase === "recording" && (
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-500 font-medium text-[14px]">Recording... {testSec}s</span>
                  </div>
                  <p className="text-[#8B95A1] text-[12px] mb-4">Say something! / Hay noi gi do!</p>
                  <button
                    type="button"
                    onClick={stopTestEarly}
                    className="px-8 py-2.5 bg-[#191F28] text-white rounded-xl text-[13px] hover:bg-[#333D4B] transition-colors duration-100"
                  >
                    Done / Xong
                  </button>
                </div>
              )}

              {micPhase === "playback" && (
                <div>
                  <p className="text-[12px] text-[#8B95A1] mb-3">Listen to your recording: / Nghe lai:</p>
                  <audio controls src={testAudioUrlRef.current} className="w-full h-10 mb-4" />
                  <div className="flex gap-2">
                    <button type="button" onClick={retryMic}
                      className="flex-1 py-3 bg-[#F2F4F6] rounded-xl text-[13px] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors duration-100 font-medium">
                      Retry / Thu lai
                    </button>
                    <button type="button" onClick={confirmMic}
                      className="flex-1 py-3 bg-[#3182F6] text-white rounded-xl text-[13px] hover:bg-[#2272EB] transition-colors duration-100 font-medium">
                      Sounds good / Nghe tot
                    </button>
                  </div>
                </div>
              )}

              {micPhase === "done" && (
                <div>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="text-[#1D9E75] text-[14px] font-medium">Mic is working!</span>
                  </div>
                  <button onClick={() => setStep("ready")}
                    className="w-full py-3 bg-[#3182F6] text-white rounded-xl text-[15px] hover:bg-[#2272EB] transition-colors duration-100 font-medium">
                    Next / Tiep tuc
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ====== STEP 6: 준비 완료 ====== */}
          {step === "ready" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#E8F3FF] flex items-center justify-center mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-[22px] font-medium text-[#191F28] mb-2">You&apos;re all set!</h1>
              <p className="text-[#8B95A1] text-[14px] mb-1">
                Everything is ready. Start when you are.
              </p>
              <p className="text-[#B0B8C1] text-[13px] mb-8">
                Moi thu da san sang. Bat dau khi ban san sang.
              </p>

              {/* 동의 체크박스 */}
              <label className="flex items-start gap-2.5 cursor-pointer text-left mb-6 bg-[#F9FAFB] rounded-xl p-4">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#3182F6]" />
                <span className="text-[13px] text-[#4E5968] leading-relaxed">
                  I confirm I will complete this interview by myself, without external help (AI tools, other people, or pre-written scripts).
                  <br /><span className="text-[#8B95A1]">Toi xac nhan se hoan thanh buoi phong van nay mot minh, khong co su tro giup tu ben ngoai.</span>
                </span>
              </label>

              {error && <div className="text-red-500 text-[13px] bg-red-400/10 px-3 py-2 rounded-xl mb-4 whitespace-pre-line">{error}</div>}

              <button
                onClick={() => {
                  if (!agreed) { setError("Please agree to the terms. / Vui long dong y dieu khoan."); return; }
                  setError("");
                  setShowConfirm(true);
                }}
                disabled={!agreed}
                className="w-full bg-[#3182F6] hover:bg-[#2272EB] text-white py-3 rounded-xl font-medium transition-colors duration-100 text-[15px] disabled:opacity-40"
              >
                Start Interview / Bat dau phong van
              </button>
            </div>
          )}
        </div>

        {/* 스텝 라벨 */}
        <p className="text-center text-[12px] text-[#B0B8C1] mt-4">
          {currentIdx + 1} / {steps.length} — {steps[currentIdx].label}
        </p>
      </div>

      {/* ====== 확인 모달 ====== */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-[380px] w-full p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-[#FFF8F0] flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8590C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="text-[18px] font-medium text-[#191F28] mb-2">Are you ready?</h2>
              <p className="text-[14px] text-[#6B7684] mb-1">
                You only have <span className="text-[#E8590C] font-medium">one chance</span> to complete this interview.
              </p>
              <p className="text-[13px] text-[#8B95A1]">
                Ban chi co <span className="text-[#E8590C] font-medium">mot lan</span> de hoan thanh phong van nay.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 py-3 bg-[#F2F4F6] rounded-xl text-[14px] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors duration-100 font-medium"
              >
                Not yet / Chua san sang
              </button>
              <button
                onClick={handleStart}
                disabled={loading}
                className="flex-1 py-3 bg-[#3182F6] text-white rounded-xl text-[14px] hover:bg-[#2272EB] transition-colors duration-100 font-medium disabled:opacity-50"
              >
                {loading ? "Starting..." : "Start now / Bat dau"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
