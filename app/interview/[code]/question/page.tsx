"use client";

import { useEffect, useState, useCallback } from "react";
import Recorder from "@/app/components/interview/Recorder";

interface Question {
  id: string;
  order_num: number;
  category: string;
  question_text_en: string;
  question_text_vi: string;
  max_duration_seconds: number;
}

export default function QuestionPage({ params }: { params: { code: string } }) {
  const [order, setOrder] = useState(1);
  const [question, setQuestion] = useState<Question | null>(null);
  const [ttsSignedUrl, setTtsSignedUrl] = useState("");
  const [totalCount, setTotalCount] = useState(7);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState("");
  const [recordStartedAt, setRecordStartedAt] = useState(0);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // 브라우저 탭 닫기/새로고침 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // 뒤로가기 감지
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setShowLeaveModal(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 질문 로드
  useEffect(() => {
    fetchQuestion();
  }, [order]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestion = async () => {
    setLoading(true);
    setTransitioning(false);
    try {
      const res = await fetch(`/api/interview/question/${order}?code=${params.code}`);
      const json = await res.json();
      if (!json.success) { setError(json.message || "Failed to load"); return; }
      setQuestion(json.question);
      setTtsSignedUrl(json.ttsSignedUrl);
      setTotalCount(json.totalCount);
      setRecordStartedAt(Date.now());
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  const handleComplete = async (audioBlob: Blob, mimeType: string) => {
    if (!question) return;
    const durationSec = Math.round((Date.now() - recordStartedAt) / 1000);
    const formData = new FormData();
    formData.append("code", params.code);
    formData.append("questionId", question.id);
    formData.append("questionOrder", String(order));
    formData.append("durationSec", String(durationSec));
    formData.append("mimeType", mimeType);
    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
    formData.append("audio", audioBlob, `answer.${ext}`);

    const res = await fetch("/api/interview/submit", { method: "POST", body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Submit failed");

    setTransitioning(true);
    setTimeout(() => {
      if (order < totalCount) {
        setOrder((prev) => prev + 1);
      } else {
        finalize();
      }
    }, 1200);
  };

  const finalize = async () => {
    try {
      await fetch("/api/interview/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: params.code }),
      });
    } catch (err) {
      console.error("Finalize error:", err);
    }
    window.location.href = `/interview/${params.code}/complete`;
  };

  const handleAbandon = useCallback(async () => {
    await fetch("/api/interview/abandon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: params.code }),
    });
    window.location.href = `/interview/${params.code}/abandoned`;
  }, [params.code]);

  if (loading) {
    return <div className="min-h-[calc(100vh-57px)] flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>;
  }

  if (error || !question) {
    return <div className="min-h-[calc(100vh-57px)] flex items-center justify-center p-4">
      <div className="bg-red-400/10 border-[0.5px] border-red-400/30 rounded-xl p-6 max-w-md">
        <p className="text-red-500">{error || "Question not found"}</p>
      </div>
    </div>;
  }

  if (transitioning) {
    return (
      <div className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 text-[15px]">
            {order < totalCount ? `Next question (${order + 1}/${totalCount})...` : "Finalizing..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      <div className="max-w-[640px] mx-auto">
        {/* 진행 바 */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] text-gray-500">Question {order} / {totalCount}</span>
            <span className="text-[13px] text-gray-500">{question.category}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-100"
              style={{ width: `${(order / totalCount) * 100}%` }}></div>
          </div>
        </div>

        {/* 질문 + 녹음 통합 카드 — 바로 표시 */}
        <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 overflow-hidden">
          <div className="p-6 select-none"
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}>
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-wide text-blue-500 font-medium mb-2">English</p>
              <p className="text-gray-900 text-[15px] leading-relaxed">{question.question_text_en}</p>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-[11px] uppercase tracking-wide text-blue-500 font-medium mb-2">Tieng Viet</p>
              <p className="text-gray-900 text-[15px] leading-relaxed">{question.question_text_vi}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 p-6 bg-gray-50/50">
            <Recorder
              key={`q-${order}`}
              ttsAudioUrl={ttsSignedUrl}
              maxDurationSeconds={question.max_duration_seconds}
              onComplete={handleComplete}
            />
          </div>
        </div>
      </div>

      {/* 이탈 방지 모달 */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h2 className="text-[18px] font-medium text-gray-900 mb-3">Leave interview?</h2>
            <p className="text-[14px] text-gray-600 mb-2">
              If you leave now, this interview code can no longer be used. Your progress will not be saved.
            </p>
            <p className="text-[13px] text-gray-500 mb-5 italic">
              Neu ban roi di, ma phong van nay se khong the su dung lai. Neu co thac mac, vui long lien he nguoi phu trach.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleAbandon}
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-[14px] text-gray-700 hover:bg-gray-200 transition-colors duration-100"
              >
                Leave / Roi di
              </button>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-[14px] hover:bg-blue-600 transition-colors duration-100"
              >
                Continue / Tiep tuc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
