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

  // 사이드바 그룹
  "nav.group.internal": { ko: "내부 관리", en: "Internal", vi: "Nội bộ" },
  "nav.group.ktc": { ko: "KTC 채용", en: "KTC Recruiting", vi: "Tuyển dụng KTC" },
  "nav.group.vtm": { ko: "VTM 인재 열람", en: "VTM Talents", vi: "Nhân tài VTM" },

  // 사이드바
  "nav.users": { ko: "사용자 관리", en: "User Management", vi: "Quản lý người dùng" },
  "nav.candidates": { ko: "후보자 관리", en: "Candidate Management", vi: "Quản lý ứng viên" },
  "nav.talents": { ko: "인재 관리", en: "Talent Management", vi: "Quản lý nhân tài" },
  "nav.inquiries": { ko: "인재 문의", en: "Inquiries", vi: "Yêu cầu tuyển dụng" },
  "nav.pool": { ko: "인재풀 등록", en: "Talent Pool", vi: "Đăng ký nhân tài" },
  "nav.companies": { ko: "기업 관리", en: "Companies", vi: "Quản lý công ty" },
  "nav.dev": { ko: "개발자 모드", en: "Dev Mode", vi: "Chế độ dev" },
  "nav.roles": { ko: "권한 안내", en: "Permissions", vi: "Phân quyền" },
  "nav.interviews": { ko: "AI 인터뷰", en: "AI Interviews", vi: "Phỏng vấn AI" },
  "nav.profiles": { ko: "프로필 카드", en: "Profile Cards", vi: "Thẻ hồ sơ" },
  "nav.messages": { ko: "VOC", en: "VOC", vi: "VOC" },
  "nav.delivery": { ko: "기업 전달", en: "Delivery", vi: "Gửi doanh nghiệp" },
  "nav.jd": { ko: "JD 관리", en: "JD Management", vi: "Quản lý JD" },

  // AI 인터뷰 관리
  "interviews.issueCodes": { ko: "코드 발급", en: "Issue Codes", vi: "Phát mã" },
  "interviews.search": { ko: "검색...", en: "Search...", vi: "Tìm kiếm..." },
  "interviews.noResult": { ko: "검색 결과가 없습니다.", en: "No results found.", vi: "Không tìm thấy kết quả." },
  "interviews.noData": { ko: "아직 인터뷰 세션이 없습니다.", en: "No interview sessions yet.", vi: "Chưa có phiên phỏng vấn nào." },
  "interviews.overdue": { ko: "기한초과", en: "Overdue", vi: "Quá hạn" },
  "interviews.unassigned": { ko: "미지정", en: "Unassigned", vi: "Chưa chỉ định" },
  "interviews.issueDesc": { ko: "후보자 정보를 입력하면 코드에 미리 담겨서 발급됩니다. 발급 후 수정 불가.", en: "Candidate info will be embedded in the code. Not editable after issue.", vi: "Thông tin ứng viên sẽ được gắn vào mã. Không thể sửa sau khi phát." },
  "interviews.deadline": { ko: "데드라인", en: "Deadline", vi: "Hạn chót" },
  "interviews.deadlineVN": { ko: "데드라인 (베트남 시간 기준)", en: "Deadline (Vietnam time)", vi: "Hạn chót (giờ Việt Nam)" },
  "interviews.noDeadline": { ko: "미입력 시 데드라인 없이 발급", en: "No deadline if left empty", vi: "Không hạn chót nếu để trống" },
  "interviews.addRow": { ko: "+ 행 추가", en: "+ Add row", vi: "+ Thêm hàng" },
  "interviews.issuing": { ko: "발급 중...", en: "Issuing...", vi: "Đang phát..." },
  "interviews.issueN": { ko: "개 발급", en: " issue", vi: " phát mã" },
  "interviews.issueComplete": { ko: "개 코드 발급 완료", en: " codes issued", vi: " mã đã được phát" },
  "interviews.copyAll": { ko: "전체 복사", en: "Copy All", vi: "Sao chép tất cả" },
  "interviews.done": { ko: "완료", en: "Done", vi: "Xong" },
  "interviews.col.code": { ko: "코드", en: "Code", vi: "Mã" },
  "interviews.col.name": { ko: "이름", en: "Name", vi: "Tên" },
  "interviews.col.email": { ko: "이메일", en: "Email", vi: "Email" },
  "interviews.col.company": { ko: "회사", en: "Company", vi: "Công ty" },
  "interviews.col.position": { ko: "포지션", en: "Position", vi: "Vị trí" },
  "interviews.col.status": { ko: "상태", en: "Status", vi: "Trạng thái" },
  "interviews.col.screeningScore": { ko: "스크리닝", en: "Screening", vi: "Sàng lọc" },
  "interviews.col.score": { ko: "인터뷰 점수", en: "Interview Score", vi: "Điểm PV" },
  "interviews.col.decision": { ko: "결정", en: "Decision", vi: "Quyết định" },

  // AI 인터뷰 상세
  "interviews.back": { ko: "뒤로", en: "Back", vi: "Quay lại" },
  "interviews.deleteSession": { ko: "세션 삭제", en: "Delete Session", vi: "Xóa phiên" },
  "interviews.deleteConfirm": { ko: "이 세션과 관련 응답이 모두 삭제됩니다. 되돌릴 수 없습니다.", en: "This session and all responses will be permanently deleted.", vi: "Phiên này và tất cả phản hồi sẽ bị xóa vĩnh viễn." },
  "interviews.deleting": { ko: "삭제 중...", en: "Deleting...", vi: "Đang xóa..." },
  "interviews.notStarted": { ko: "아직 인터뷰가 시작되지 않았습니다.", en: "Interview has not started yet.", vi: "Phỏng vấn chưa bắt đầu." },
  "interviews.notStartedHint": { ko: "후보자가 코드를 입력하면 인터뷰가 시작됩니다.", en: "Interview will begin when the candidate enters the code.", vi: "Phỏng vấn sẽ bắt đầu khi ứng viên nhập mã." },
  "interviews.label.name": { ko: "이름", en: "Name", vi: "Tên" },
  "interviews.label.email": { ko: "이메일", en: "Email", vi: "Email" },
  "interviews.label.phone": { ko: "전화번호", en: "Phone", vi: "Điện thoại" },
  "interviews.label.company": { ko: "회사", en: "Company", vi: "Công ty" },
  "interviews.label.position": { ko: "포지션", en: "Position", vi: "Vị trí" },
  "interviews.label.deadline": { ko: "데드라인", en: "Deadline", vi: "Hạn chót" },
  "interviews.label.created": { ko: "생성", en: "Created", vi: "Tạo lúc" },
  "interviews.label.started": { ko: "시작", en: "Started", vi: "Bắt đầu" },
  "interviews.label.completed": { ko: "완료", en: "Completed", vi: "Hoàn thành" },
  "interviews.humanReview": { ko: "사람 검토", en: "Human Review", vi: "Đánh giá thủ công" },
  "interviews.notePlaceholder": { ko: "메모를 입력하세요...", en: "Your notes...", vi: "Ghi chú..." },
  "interviews.currentDecision": { ko: "현재 결정", en: "Current decision", vi: "Quyết định hiện tại" },
  "interviews.reviewed": { ko: "검토일", en: "reviewed", vi: "đã đánh giá" },

  // 후보자 관리
  "candidates.title": { ko: "후보자 관리", en: "Candidate Management", vi: "Quản lý ứng viên" },
  "candidates.syncSheets": { ko: "시트 동기화", en: "Sync Sheets", vi: "Đồng bộ Sheet" },
  "candidates.llmScreening": { ko: "LLM 스크리닝", en: "LLM Screening", vi: "Sàng lọc LLM" },
  "candidates.generateCards": { ko: "카드 생성", en: "Generate Cards", vi: "Tạo thẻ" },
  "candidates.tab.pending": { ko: "스크리닝 대기", en: "Pending Screening", vi: "Chờ sàng lọc" },
  "candidates.tab.aiPassed": { ko: "스크리닝 합격", en: "Screening Passed", vi: "Đạt sàng lọc" },
  "candidates.tab.aiInterviewSent": { ko: "AI 인터뷰 발송", en: "AI Interview Sent", vi: "Đã gửi PV AI" },
  "candidates.tab.aiInterviewDone": { ko: "AI 인터뷰 완료", en: "AI Interview Done", vi: "PV AI xong" },
  "candidates.tab.aiInterviewPassed": { ko: "AI 인터뷰 합격", en: "AI Interview Passed", vi: "Đạt PV AI" },
  "candidates.tab.finalPassed": { ko: "최종 합격", en: "Final Passed", vi: "Đạt" },
  "candidates.tab.screeningFailed": { ko: "스크리닝 실패", en: "Screening Failed", vi: "Sàng lọc thất bại" },
  "candidates.tab.rejected": { ko: "불합격", en: "Rejected", vi: "Không đạt" },
  "candidates.stat.pending": { ko: "스크리닝 대기", en: "Pending", vi: "Chờ sàng lọc" },
  "candidates.stat.aiPassed": { ko: "스크리닝 합격", en: "Screening Passed", vi: "Đạt sàng lọc" },
  "candidates.stat.aiInterviewSent": { ko: "AI 인터뷰 발송", en: "AI Sent", vi: "Đã gửi AI" },
  "candidates.stat.aiInterviewDone": { ko: "AI 인터뷰 완료", en: "AI Done", vi: "AI xong" },
  "candidates.stat.finalPassed": { ko: "최종 합격", en: "Final Passed", vi: "Đạt" },
  "candidates.stat.screeningFailed": { ko: "스크리닝 실패", en: "Screening Failed", vi: "Sàng lọc thất bại" },
  "candidates.stat.rejected": { ko: "불합격", en: "Rejected", vi: "Không đạt" },
  "candidates.allCompanies": { ko: "전체 회사", en: "All Companies", vi: "Tất cả công ty" },
  "candidates.allPositions": { ko: "전체 포지션", en: "All Positions", vi: "Tất cả vị trí" },
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

  // AI 인터뷰
  "aiInterview.send": { ko: "AI 인터뷰 발송", en: "Send AI Interview", vi: "Gửi PV AI" },
  "aiInterview.sending": { ko: "발송 중...", en: "Sending...", vi: "Đang gửi..." },
  "aiInterview.alreadySent": { ko: "발송 완료", en: "Already Sent", vi: "Đã gửi" },
  "aiInterview.viewResult": { ko: "AI 인터뷰 결과 보기", en: "View AI Interview Result", vi: "Xem kết quả PV AI" },
  "aiInterview.finalPass": { ko: "최종 합격", en: "Final Pass", vi: "Đạt" },
  "aiInterview.reject": { ko: "불합격", en: "Reject", vi: "Không đạt" },
  "aiInterview.rejectAction": { ko: "불합격 처리", en: "Mark as Rejected", vi: "Đánh không đạt" },
  "aiInterview.memo": { ko: "메모", en: "Memo", vi: "Ghi chú" },
  "aiInterview.memoPlaceholder": { ko: "메모...", en: "Notes...", vi: "Ghi chú..." },
  "aiInterview.sendAll": { ko: "전체 발송", en: "Send All", vi: "Gửi tất cả" },
  "aiInterview.sendAllDesc": { ko: "명에게 AI 인터뷰 코드를 일괄 발송할 수 있습니다", en: "candidates can receive AI interview codes", vi: "ứng viên có thể nhận mã PV AI" },
  "aiInterview.status": { ko: "AI 인터뷰 상태", en: "AI Interview Status", vi: "Trạng thái PV AI" },
  "aiInterview.notStarted": { ko: "미시작", en: "Not Started", vi: "Chưa bắt đầu" },
  "aiInterview.inProgress": { ko: "진행 중", en: "In Progress", vi: "Đang làm" },
  "aiInterview.completed": { ko: "완료", en: "Completed", vi: "Hoàn thành" },
  "aiInterview.scored": { ko: "채점 완료", en: "Scored", vi: "Đã chấm" },

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

  // VOC
  "messages.compose": { ko: "새 메시지", en: "Compose", vi: "Soạn tin" },
  "messages.empty": { ko: "아직 VOC가 없습니다.", en: "No VOC yet.", vi: "Chưa có VOC." },
  "messages.selectThread": { ko: "대화를 선택하세요", en: "Select a conversation", vi: "Chọn cuộc trò chuyện" },
  "messages.replyPlaceholder": { ko: "답장을 입력하세요...", en: "Type your reply...", vi: "Nhập trả lời..." },
  "messages.send": { ko: "보내기", en: "Send", vi: "Gửi" },
  "messages.sending": { ko: "발송 중...", en: "Sending...", vi: "Đang gửi..." },
  "messages.newMessage": { ko: "새 메시지 작성", en: "New Message", vi: "Tin nhắn mới" },
  "messages.toEmail": { ko: "받는 사람", en: "To", vi: "Đến" },
  "messages.toName": { ko: "이름", en: "Name", vi: "Tên" },
  "messages.subject": { ko: "제목", en: "Subject", vi: "Tiêu đề" },
  "messages.body": { ko: "내용", en: "Message", vi: "Nội dung" },

  // JD 관리
  "jd.addNew": { ko: "+ 새 JD 추가", en: "+ Add New JD", vi: "+ Thêm JD mới" },
  "jd.totalJD": { ko: "전체 JD", en: "Total JDs", vi: "Tổng JD" },
  "jd.activeJD": { ko: "후보자 있는 JD", en: "Active JDs", vi: "JD có ứng viên" },
  "jd.totalHires": { ko: "총 채용 인원", en: "Total Hires", vi: "Tổng tuyển" },
  "jd.totalApplicants": { ko: "총 지원자", en: "Total Applicants", vi: "Tổng ứng viên" },
  "jd.hires": { ko: "채용", en: "Hires", vi: "Tuyển" },
  "jd.applicants": { ko: "지원", en: "Applicants", vi: "Ứng viên" },
  "jd.postingLinks": { ko: "구인 공고 링크", en: "Job Posting Links", vi: "Link đăng tuyển" },
  "jd.noPostings": { ko: "등록된 공고 링크가 없습니다", en: "No posting links registered", vi: "Chưa có link đăng tuyển" },
  "jd.add": { ko: "+ 추가", en: "+ Add", vi: "+ Thêm" },
  "jd.posted": { ko: "게시", en: "Posted", vi: "Đăng" },
  "jd.form.code": { ko: "코드", en: "Code", vi: "Mã" },
  "jd.form.company": { ko: "회사명", en: "Company", vi: "Công ty" },
  "jd.form.position": { ko: "포지션", en: "Position", vi: "Vị trí" },
  "jd.form.hires": { ko: "채용 인원", en: "Headcount", vi: "Số lượng" },
  "jd.form.experience": { ko: "경력", en: "Experience", vi: "Kinh nghiệm" },
  "jd.form.salary": { ko: "급여", en: "Salary", vi: "Lương" },
  "jd.form.required": { ko: "코드, 회사명, 포지션은 필수입니다", en: "Code, company, and position are required", vi: "Mã, công ty và vị trí là bắt buộc" },
  "jd.form.duplicateCode": { ko: "이미 존재하는 코드입니다", en: "This code already exists", vi: "Mã này đã tồn tại" },
  "jd.form.saving": { ko: "저장 중...", en: "Saving...", vi: "Đang lưu..." },
  "jd.form.addTitle": { ko: "새 JD 추가", en: "Add New JD", vi: "Thêm JD mới" },
  "jd.form.editTitle": { ko: "JD 수정", en: "Edit JD", vi: "Sửa JD" },
  "jd.form.add": { ko: "추가", en: "Add", vi: "Thêm" },
  "jd.deleteConfirm": { ko: "JD를 삭제하시겠습니까?", en: "Delete this JD?", vi: "Xóa JD này?" },
  "jd.posting.platform": { ko: "플랫폼", en: "Platform", vi: "Nền tảng" },
  "jd.posting.status": { ko: "상태", en: "Status", vi: "Trạng thái" },
  "jd.posting.url": { ko: "URL", en: "URL", vi: "URL" },
  "jd.posting.postedAt": { ko: "게시 일시", en: "Posted Date", vi: "Ngày đăng" },
  "jd.posting.active": { ko: "게시중", en: "Active", vi: "Đang đăng" },
  "jd.posting.paused": { ko: "일시중지", en: "Paused", vi: "Tạm dừng" },
  "jd.posting.closed": { ko: "마감", en: "Closed", vi: "Đã đóng" },
  "jd.posting.expired": { ko: "만료", en: "Expired", vi: "Hết hạn" },
  // 상태
  "status.new": { ko: "대기", en: "Pending", vi: "Chờ" },
  "status.passed": { ko: "스크리닝 합격", en: "Screening Passed", vi: "Đạt sàng lọc" },
  "status.ai_interview_sent": { ko: "AI 인터뷰 발송", en: "AI Sent", vi: "Đã gửi AI" },
  "status.ai_interview_done": { ko: "AI 인터뷰 완료", en: "AI Done", vi: "AI xong" },
  "status.ai_interview_passed": { ko: "AI 인터뷰 합격", en: "AI Passed", vi: "Đạt PV AI" },
  "status.final_passed": { ko: "최종 합격", en: "Final Passed", vi: "Đạt" },
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
