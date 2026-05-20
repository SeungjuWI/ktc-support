"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AdminLang = "ko" | "en" | "vi";

const translations: Record<string, Record<AdminLang, string>> = {
  // 공통
  "common.loading": { ko: "로딩 중...", en: "Loading...", vi: "Đang tải..." },
  "common.save": { ko: "저장", en: "Save", vi: "Lưu" },
  "common.cancel": { ko: "취소", en: "Cancel", vi: "Hủy" },
  "common.delete": { ko: "삭제", en: "Delete", vi: "Xóa" },
  "common.edit": { ko: "수정", en: "Edit", vi: "Sửa" },
  "common.all": { ko: "전체", en: "All", vi: "Tất cả" },
  "common.close": { ko: "닫기", en: "Close", vi: "Đóng" },

  // 사이드바
  "nav.users": { ko: "사용자 관리", en: "User Management", vi: "Quản lý người dùng" },
  "nav.candidates": { ko: "후보자 관리", en: "Candidate Management", vi: "Quản lý ứng viên" },
  "nav.talents": { ko: "인재 관리", en: "Talent Management", vi: "Quản lý nhân tài" },
  "nav.inquiries": { ko: "인재 문의", en: "Inquiries", vi: "Yêu cầu tuyển dụng" },
  "nav.pool": { ko: "인재풀 등록", en: "Talent Pool", vi: "Đăng ký nhân tài" },
  "nav.roles": { ko: "권한 안내", en: "Permissions", vi: "Phân quyền" },
  "nav.interviews": { ko: "AI 인터뷰", en: "AI Interviews", vi: "Phỏng vấn AI" },

  // AI 인터뷰
  "interviews.issueCodes": { ko: "코드 발급", en: "Issue Codes", vi: "Phát mã" },

  // 후보자 관리
  "candidates.title": { ko: "후보자 관리", en: "Candidate Management", vi: "Quản lý ứng viên" },
  "candidates.syncSheets": { ko: "시트 동기화", en: "Sync Sheets", vi: "Đồng bộ Sheet" },
  "candidates.llmScreening": { ko: "LLM 스크리닝", en: "LLM Screening", vi: "Sàng lọc LLM" },
  "candidates.generateCards": { ko: "카드 생성", en: "Generate Cards", vi: "Tạo thẻ" },
  "candidates.tab.pending": { ko: "스크리닝 대기", en: "Pending Screening", vi: "Chờ sàng lọc" },
  "candidates.tab.aiPassed": { ko: "AI 합격", en: "AI Passed", vi: "Đạt AI" },
  "candidates.tab.phonePending": { ko: "폰인터뷰 대기", en: "Phone Interview Pending", vi: "Chờ phỏng vấn" },
  "candidates.tab.phoneDone": { ko: "폰인터뷰 완료", en: "Phone Interview Done", vi: "Phỏng vấn xong" },
  "candidates.tab.finalPassed": { ko: "폰인터뷰 합격", en: "Phone Interview Passed", vi: "Đạt phỏng vấn" },
  "candidates.tab.screeningFailed": { ko: "스크리닝 실패", en: "Screening Failed", vi: "Sàng lọc thất bại" },
  "candidates.tab.rejected": { ko: "불합격", en: "Rejected", vi: "Không đạt" },
  "candidates.stat.pending": { ko: "스크리닝 대기", en: "Pending", vi: "Chờ sàng lọc" },
  "candidates.stat.aiPassed": { ko: "AI 합격", en: "AI Passed", vi: "Đạt AI" },
  "candidates.stat.phonePending": { ko: "폰인터뷰 대기", en: "Phone Pending", vi: "Chờ PV" },
  "candidates.stat.phoneDone": { ko: "폰인터뷰 완료", en: "Phone Done", vi: "PV xong" },
  "candidates.stat.finalPassed": { ko: "폰인터뷰 합격", en: "Phone Interview Passed", vi: "Đạt" },
  "candidates.stat.screeningFailed": { ko: "스크리닝 실패", en: "Screening Failed", vi: "Sàng lọc thất bại" },
  "candidates.stat.rejected": { ko: "불합격", en: "Rejected", vi: "Không đạt" },
  "candidates.allJobs": { ko: "전체 직군", en: "All Jobs", vi: "Tất cả vị trí" },
  "candidates.allSources": { ko: "전체 소스", en: "All Sources", vi: "Tất cả nguồn" },
  "candidates.noData": { ko: "시트 동기화를 실행하여 후보자를 불러오세요.", en: "Sync sheets to load candidates.", vi: "Đồng bộ sheet để tải ứng viên." },
  "candidates.noMatch": { ko: "해당 조건의 후보자가 없습니다.", en: "No candidates match this filter.", vi: "Không có ứng viên phù hợp." },

  // 후보자 상세
  "detail.basicInfo": { ko: "기본 정보", en: "Basic Info", vi: "Thông tin cơ bản" },
  "detail.position": { ko: "포지션", en: "Position", vi: "Vị trí" },
  "detail.experience": { ko: "경력", en: "Experience", vi: "Kinh nghiệm" },
  "detail.city": { ko: "도시", en: "City", vi: "Thành phố" },
  "detail.email": { ko: "이메일", en: "Email", vi: "Email" },
  "detail.phone": { ko: "전화", en: "Phone", vi: "Điện thoại" },
  "detail.applicationInfo": { ko: "지원 정보", en: "Application Info", vi: "Thông tin ứng tuyển" },
  "detail.source": { ko: "소스", en: "Source", vi: "Nguồn" },
  "detail.appliedJob": { ko: "지원 공고", en: "Applied Job", vi: "Vị trí ứng tuyển" },
  "detail.appliedCompany": { ko: "지원 회사", en: "Applied Company", vi: "Công ty ứng tuyển" },
  "detail.appliedDate": { ko: "지원일", en: "Applied Date", vi: "Ngày ứng tuyển" },
  "detail.screeningResult": { ko: "LLM 스크리닝 결과", en: "LLM Screening Result", vi: "Kết quả sàng lọc LLM" },
  "detail.yoeCheck": { ko: "경력 검증", en: "YOE Check", vi: "Kiểm tra kinh nghiệm" },
  "detail.summary": { ko: "요약", en: "Summary", vi: "Tóm tắt" },
  "detail.skills": { ko: "스킬", en: "Skills", vi: "Kỹ năng" },
  "detail.strengths": { ko: "강점", en: "Strengths", vi: "Điểm mạnh" },
  "detail.gaps": { ko: "약점", en: "Gaps", vi: "Điểm yếu" },
  "detail.career": { ko: "경력", en: "Career", vi: "Kinh nghiệm" },
  "detail.rejectionReason": { ko: "불합격 사유", en: "Rejection Reason", vi: "Lý do không đạt" },
  "detail.viewCV": { ko: "CV 보기", en: "View CV", vi: "Xem CV" },
  "detail.portfolio": { ko: "포트폴리오", en: "Portfolio", vi: "Portfolio" },

  // 폰인터뷰
  "phone.schedule": { ko: "폰인터뷰 일정", en: "Phone Interview Schedule", vi: "Lịch phỏng vấn" },
  "phone.moveToPending": { ko: "폰인터뷰 대기로 이동", en: "Move to Phone Interview", vi: "Chuyển sang chờ phỏng vấn" },
  "phone.markDone": { ko: "폰인터뷰 완료 처리", en: "Mark Interview Done", vi: "Hoàn thành phỏng vấn" },
  "phone.finalPass": { ko: "폰인터뷰 합격", en: "Phone Interview Passed", vi: "Đạt phỏng vấn" },
  "phone.reject": { ko: "불합격", en: "Reject", vi: "Không đạt" },
  "phone.rejectAction": { ko: "불합격 처리", en: "Mark as Rejected", vi: "Đánh không đạt" },
  "phone.memo": { ko: "폰인터뷰 메모", en: "Phone Interview Memo", vi: "Ghi chú phỏng vấn" },
  "phone.memoPlaceholder": { ko: "인터뷰 내용, 인상, 특이사항 등...", en: "Interview notes, impressions, etc...", vi: "Nội dung phỏng vấn, nhận xét..." },

  // 인재 관리
  "talents.title": { ko: "인재 관리", en: "Talent Management", vi: "Quản lý nhân tài" },
  "talents.publishAll": { ko: "전체 게시", en: "Publish All", vi: "Đăng tất cả" },
  "talents.unpublishAll": { ko: "전체 비공개", en: "Unpublish All", vi: "Ẩn tất cả" },
  "talents.addTalent": { ko: "+ 인재 등록", en: "+ Add Talent", vi: "+ Thêm nhân tài" },

  // 인재풀 등록
  "pool.title": { ko: "인재풀 등록", en: "Talent Pool Registration", vi: "Đăng ký nhân tài" },
  "pool.dropzone": { ko: "PDF 파일을 드래그하거나 클릭하여 업로드", en: "Drag PDF files here or click to upload", vi: "Kéo file PDF vào đây hoặc nhấp để tải lên" },
  "pool.dropzoneHint": { ko: "여러 파일을 한 번에 업로드할 수 있습니다 (PDF만 지원)", en: "You can upload multiple files at once (PDF only)", vi: "Có thể tải lên nhiều file cùng lúc (chỉ PDF)" },
  "pool.total": { ko: "전체", en: "Total", vi: "Tổng" },
  "pool.pending": { ko: "대기", en: "Pending", vi: "Chờ" },
  "pool.done": { ko: "완료", en: "Done", vi: "Xong" },
  "pool.error": { ko: "실패", en: "Error", vi: "Lỗi" },
  "pool.clearAll": { ko: "전체 삭제", en: "Clear All", vi: "Xóa tất cả" },
  "pool.runAll": { ko: "전체 스크리닝", en: "Screen All", vi: "Sàng lọc tất cả" },
  "pool.screening": { ko: "스크리닝 중", en: "Screening", vi: "Đang sàng lọc" },
  "pool.screeningInProgress": { ko: "스크리닝 중...", en: "Screening...", vi: "Đang sàng lọc..." },
  "pool.retry": { ko: "재시도", en: "Retry", vi: "Thử lại" },
  "pool.viewCard": { ko: "카드 보기", en: "View Card", vi: "Xem thẻ" },
  "pool.empty": { ko: "등록된 포트폴리오가 없습니다", en: "No portfolios registered", vi: "Chưa có portfolio nào" },
  "pool.emptyHint": { ko: "PDF 파일을 업로드하여 인재풀에 등록하세요", en: "Upload PDF files to register in the talent pool", vi: "Tải lên file PDF để đăng ký nhân tài" },

  // 상태
  "status.new": { ko: "대기", en: "Pending", vi: "Chờ" },
  "status.passed": { ko: "AI 합격", en: "AI Passed", vi: "Đạt AI" },
  "status.phone_interview_pending": { ko: "폰인터뷰 대기", en: "Phone Pending", vi: "Chờ PV" },
  "status.phone_interview_done": { ko: "폰인터뷰 완료", en: "Phone Done", vi: "PV xong" },
  "status.final_passed": { ko: "폰인터뷰 합격", en: "Phone Interview Passed", vi: "Đạt" },
  "status.rejected": { ko: "불합격", en: "Rejected", vi: "Không đạt" },
  "status.screening_failed": { ko: "스크리닝 실패", en: "Screening Failed", vi: "Sàng lọc thất bại" },
};

interface AdminI18nContextType {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
  t: (key: string) => string;
}

const AdminI18nContext = createContext<AdminI18nContextType>({
  lang: "ko",
  setLang: () => {},
  t: (key) => key,
});

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>("ko");

  useEffect(() => {
    const saved = localStorage.getItem("admin-lang") as AdminLang | null;
    if (saved && ["ko", "en", "vi"].includes(saved)) setLangState(saved);
  }, []);

  const setLang = (l: AdminLang) => {
    setLangState(l);
    localStorage.setItem("admin-lang", l);
  };

  const t = (key: string) => {
    return translations[key]?.[lang] || translations[key]?.["en"] || key;
  };

  return (
    <AdminI18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  return useContext(AdminI18nContext);
}

export function LangSelector() {
  const { lang, setLang } = useAdminI18n();
  const langs: { key: AdminLang; label: string }[] = [
    { key: "ko", label: "KO" },
    { key: "en", label: "EN" },
    { key: "vi", label: "VI" },
  ];

  return (
    <div className="flex gap-1">
      {langs.map((l) => (
        <button
          key={l.key}
          onClick={() => setLang(l.key)}
          className={`px-2 py-1 rounded-lg text-[12px] transition-colors ${
            lang === l.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
