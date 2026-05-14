"use client";

import { useState, useEffect, useRef } from "react";
import { Talent } from "@/lib/types";
import {
  getGuestUser,
  saveGuestUser,
  validateGuestInput,
} from "@/lib/guest-user";
import { submitInterviewRequest } from "@/lib/supabase-queries";
import { availabilityKR, formatRoleTitle } from "@/lib/i18n";

export function InterviewRequestModal({
  talent,
  onClose,
  onSuccess,
}: {
  talent: Talent;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState("");
  const savedGuest = getGuestUser();
  const [isEditing, setIsEditing] = useState(!savedGuest);
  const [form, setForm] = useState({
    companyName: savedGuest?.companyName ?? "",
    contactName: savedGuest?.contactName ?? "",
    contactEmail: savedGuest?.contactEmail ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (isEditing) firstInputRef.current?.focus();
  }, [isEditing]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleSaveGuest() {
    const { valid, errors: newErrors } = validateGuestInput(form);
    if (!valid) {
      setErrors(newErrors);
      return;
    }
    saveGuestUser(form);
    setIsEditing(false);
    setErrors({});
  }

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const { valid, errors: newErrors } = validateGuestInput(form);
    if (!valid) {
      setErrors(newErrors);
      return;
    }
    const guest = saveGuestUser(form);
    setSubmitting(true);

    const { error } = await submitInterviewRequest({
      talent_id: talent.id,
      company_name: guest.companyName,
      contact_name: guest.contactName,
      contact_email: guest.contactEmail,
      message: message || undefined,
    });

    setSubmitting(false);
    if (error) {
      alert("요청 중 오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }
    onSuccess();
  }

  const inputClass = (field: string) =>
    `w-full px-3.5 py-3 bg-white border-[0.5px] rounded-xl text-[14px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 ${
      errors[field]
        ? "border-red-400 focus:border-red-400"
        : "border-gray-200/60 focus:border-blue-500"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-[20px] p-6 w-full max-w-[440px] mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-5">
          <h2
            id="modal-title"
            className="text-[18px] font-medium text-gray-900"
          >
            인터뷰 요청
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-[10px]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="#6B7684"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M5 5l8 8M13 5l-8 8" />
            </svg>
          </button>
        </div>

        {/* 요청 대상 */}
        <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-4">
          <p className="text-[12px] text-gray-500 mb-2">요청 대상</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-medium text-blue-500">
                {talent.initials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-gray-900">
                {formatRoleTitle(talent.role)} · {talent.years_exp}년차
              </p>
              <p className="text-[12px] text-gray-600">
                OVR {talent.ovr_score} · {talent.location} ·{" "}
                {availabilityKR[talent.availability]}
              </p>
            </div>
          </div>
        </div>

        {/* 요청자 정보 */}
        <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-4">
          {isEditing ? (
            <>
              <p className="text-[12px] text-gray-500 mb-1.5">요청자 정보</p>
              <p className="text-[11px] text-gray-500 mb-3">
                한 번 입력하면 다음부터는 자동으로 채워집니다
              </p>
              <div className="flex flex-col gap-2.5">
                <div>
                  <input
                    ref={firstInputRef}
                    type="text"
                    placeholder="회사명 (예: ABC상사)"
                    value={form.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    className={inputClass("companyName")}
                  />
                  {errors.companyName && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.companyName}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="담당자명 (예: 김인사)"
                    value={form.contactName}
                    onChange={(e) => updateField("contactName", e.target.value)}
                    className={inputClass("contactName")}
                  />
                  {errors.contactName && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.contactName}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="이메일 (예: hr@company.com)"
                    value={form.contactEmail}
                    onChange={(e) =>
                      updateField("contactEmail", e.target.value)
                    }
                    className={inputClass("contactEmail")}
                  />
                  {errors.contactEmail && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.contactEmail}
                    </p>
                  )}
                </div>
              </div>
              {savedGuest && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setForm({
                        companyName: savedGuest.companyName,
                        contactName: savedGuest.contactName,
                        contactEmail: savedGuest.contactEmail,
                      });
                      setIsEditing(false);
                      setErrors({});
                    }}
                    className="flex-1 py-2.5 bg-white border-[0.5px] border-gray-200/60 text-gray-600 rounded-lg text-[13px] font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveGuest}
                    className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-[13px] font-medium"
                  >
                    저장
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] text-gray-500">요청자 정보</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[12px] text-blue-500 font-medium"
                >
                  수정
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="#6B7684"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="1" y="3" width="12" height="10" rx="1.5" />
                    <path d="M1 6h12M5 1v4M9 1v4" />
                  </svg>
                  <span className="text-[14px] text-gray-900">
                    {form.companyName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="#6B7684"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="7" cy="4.5" r="2.5" />
                    <path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" />
                  </svg>
                  <span className="text-[14px] text-gray-900">
                    {form.contactName} · {form.contactEmail}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 메시지 */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-medium text-gray-600">
              메시지
            </span>
            <span className="text-[11px] text-gray-500">선택</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="예) 우선 화상 면접 30분 가능한지 확인 부탁드립니다."
            className="w-full min-h-[80px] px-3.5 py-3 border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 resize-none outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
          />
        </div>

        {/* 안내 */}
        <div className="bg-grade-s-bg rounded-[10px] px-3.5 py-2.5 flex gap-2 mb-4">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="flex-shrink-0 mt-[1px]"
          >
            <circle cx="8" cy="8" r="7" stroke="#E8590C" strokeWidth="1.2" />
            <path
              d="M8 5v3M8 10.5v.5"
              stroke="#E8590C"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-[12px] text-gray-600 leading-relaxed">
            요청 즉시 KTC 매니저가 후보자와 일정을 조율합니다. 영업일 1일 내
            회신 드립니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl text-[15px] font-medium active:scale-[0.98] transition-transform"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-[2] py-3.5 bg-blue-500 text-white rounded-xl text-[15px] font-medium hover:bg-blue-600 active:scale-[0.98] transition disabled:opacity-60"
          >
            {submitting ? "요청 중..." : "요청 보내기"}
          </button>
        </div>
      </div>
    </div>
  );
}
