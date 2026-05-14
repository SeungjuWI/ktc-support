"use client";

import { useState, useEffect, useCallback } from "react";
import { Talent } from "@/lib/types";
import { hasRequestedTalent } from "@/lib/interview-requests";
import { InterviewRequestModal } from "./InterviewRequestModal";
import { Toast } from "@/app/components/ui/Toast";

export function InterviewCTA({ talent }: { talent: Talent }) {
  const [open, setOpen] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setAlreadyRequested(hasRequestedTalent(talent.id));
  }, [talent.id]);

  const handleSuccess = useCallback(() => {
    setAlreadyRequested(true);
    setOpen(false);
    setToast("요청이 접수되었습니다. KTC 매니저가 곧 연락드립니다.");
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return (
    <>
      <div className="bg-white border-[0.5px] border-gray-200/60 rounded-[20px] px-5 py-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[12px] text-gray-500 mb-1">희망 연봉 (월)</p>
          <p className="text-[18px] font-medium text-gray-900">
            {talent.desired_salary_krw}만원
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          disabled={alreadyRequested}
          className={`px-6 py-3.5 rounded-xl text-[15px] font-medium flex-shrink-0 transition ${
            alreadyRequested
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]"
          }`}
        >
          {alreadyRequested ? "요청 완료" : "인터뷰 요청하기"}
        </button>
      </div>

      {open && (
        <InterviewRequestModal
          talent={talent}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {toast && <Toast message={toast} onClose={clearToast} />}
    </>
  );
}
