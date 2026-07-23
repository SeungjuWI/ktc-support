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

  // 사용자 관리
  "users.title": { ko: "사용자 관리", en: "User Management", vi: "Quản lý người dùng" },
  "users.desc": { ko: "가입 승인 및 사용자 관리", en: "Approve sign-ups & manage users", vi: "Phê duyệt đăng ký & quản lý người dùng" },
  "users.tabAll": { ko: "전체", en: "All", vi: "Tất cả" },
  "users.tabSuperAdmin": { ko: "총관리자", en: "Super Admin", vi: "Super Admin" },
  "users.tabAdmin": { ko: "관리자", en: "Admin", vi: "Quản trị" },
  "users.tabCompany": { ko: "기업", en: "Company", vi: "Doanh nghiệp" },
  "users.pendingApproval": { ko: "가입 승인", en: "Pending Approval", vi: "Chờ phê duyệt" },
  "users.pendingCount": { ko: "명 대기 중", en: " pending", vi: " đang chờ" },
  "users.noPending": { ko: "대기 중인 사용자가 없습니다", en: "No pending users", vi: "Không có người dùng đang chờ" },
  "users.noUsers": { ko: "사용자가 없습니다", en: "No users", vi: "Không có người dùng" },
  "users.noName": { ko: "이름 없음", en: "No name", vi: "Không có tên" },
  "users.approve": { ko: "승인", en: "Approve", vi: "Phê duyệt" },
  "users.reject": { ko: "거절", en: "Reject", vi: "Từ chối" },
  "users.promoteAdmin": { ko: "관리자 임명", en: "Promote to Admin", vi: "Nâng lên Admin" },
  "users.promoteSuperAdmin": { ko: "총관리자 임명", en: "Promote to Super Admin", vi: "Nâng lên Super Admin" },
  "users.demote": { ko: "권한 해제", en: "Remove Role", vi: "Hạ quyền" },
  "users.deleteUser": { ko: "탈퇴 처리", en: "Delete User", vi: "Xóa người dùng" },
  "users.deleteConfirm": { ko: "을(를) 탈퇴 처리하시겠습니까? 되돌릴 수 없습니다.", en: " — Delete this user? This cannot be undone.", vi: " — Xóa người dùng này? Không thể hoàn tác." },
  "users.roleSuperAdmin": { ko: "총 관리자", en: "Super Admin", vi: "Super Admin" },
  "users.roleAdmin": { ko: "관리자", en: "Admin", vi: "Admin" },
  "users.roleUser": { ko: "기업", en: "Company", vi: "Doanh nghiệp" },

  // 사이드바 그룹
  "nav.group.internal": { ko: "내부 관리", en: "Internal", vi: "Nội bộ" },
  "nav.group.ktc": { ko: "KTC 채용", en: "KTC Recruiting", vi: "Tuyển dụng KTC" },
  "nav.group.vtm": { ko: "KTC Support 인재 열람", en: "KTC Support Talents", vi: "Nhân tài KTC Support" },

  // 사이드바
  "nav.users": { ko: "사용자 관리", en: "User Management", vi: "Quản lý người dùng" },
  "nav.dashboard": { ko: "채용 대시보드", en: "Dashboard", vi: "Bảng điều khiển" },
  "nav.candidates": { ko: "후보자 관리", en: "Candidate Management", vi: "Quản lý ứng viên" },
  "nav.talents": { ko: "인재 관리", en: "Talent Management", vi: "Quản lý nhân tài" },
  "nav.inquiries": { ko: "인재 문의", en: "Inquiries", vi: "Yêu cầu tuyển dụng" },
  "nav.pool": { ko: "인재풀 등록", en: "Talent Pool", vi: "Đăng ký nhân tài" },
  "nav.roles": { ko: "권한 안내", en: "Permissions", vi: "Phân quyền" },
  "nav.profiles": { ko: "프로필 카드", en: "Profile Cards", vi: "Thẻ hồ sơ" },
  "nav.delivery": { ko: "기업 전달", en: "Delivery", vi: "Gửi doanh nghiệp" },
  "nav.jd": { ko: "JD 관리", en: "JD Management", vi: "Quản lý JD" },

  // 채용 대시보드
  "dash.title": { ko: "채용 대시보드", en: "Recruiting Dashboard", vi: "Bảng điều khiển tuyển dụng" },
  "dash.subtitle": { ko: "KTC Ops · Qualified Candidates 시트 연동", en: "Synced with KTC Ops · Qualified Candidates sheets", vi: "Đồng bộ sheet KTC Ops · Qualified Candidates" },
  "dash.refresh": { ko: "새로고침", en: "Refresh", vi: "Làm mới" },
  "dash.loading": { ko: "불러오는 중...", en: "Loading...", vi: "Đang tải..." },
  "dash.syncHires": { ko: "입사자 동기화 (KTC Ops)", en: "Sync Hires (KTC Ops)", vi: "Đồng bộ nhân sự (KTC Ops)" },
  "dash.pullSheet": { ko: "시트 → 앱 동기화", en: "Sync Sheet → App", vi: "Đồng bộ Sheet → App" },
  "dash.syncing": { ko: "동기화 중...", en: "Syncing...", vi: "Đang đồng bộ..." },
  "dash.sheetError": { ko: "시트 연동 오류", en: "Sheet sync error", vi: "Lỗi đồng bộ sheet" },
  "dash.card.total": { ko: "전체 접수", en: "Total Applied", vi: "Tổng hồ sơ" },
  "dash.card.pending": { ko: "스크리닝 대기", en: "Pending Screening", vi: "Chờ sàng lọc" },
  "dash.card.screened": { ko: "스크리닝 합격", en: "Screening Passed", vi: "Đạt sàng lọc" },
  "dash.card.readyToForward": { ko: "발송 대기", en: "Ready to Forward", vi: "Chờ gửi DN" },
  "dash.card.sent": { ko: "기업 발송", en: "Sent to Company", vi: "Đã gửi DN" },
  "dash.card.interviewing": { ko: "면접 진행", en: "Interviewing", vi: "Đang phỏng vấn" },
  "dash.card.offer": { ko: "오퍼·계약", en: "Offer & Contract", vi: "Offer & hợp đồng" },
  "dash.card.matched": { ko: "매칭 완료 (입사)", en: "Matched (Hired)", vi: "Đã match" },
  "dash.card.active": { ko: "재직 중 (KTC Ops)", en: "Active (KTC Ops)", vi: "Đang làm việc" },
  "dash.card.activeSub": { ko: "채널 외 입사자 포함", en: "incl. non-channel hires", vi: "gồm tuyển ngoài kênh" },
  "dash.card.rejected": { ko: "탈락", en: "Rejected", vi: "Không đạt" },
  "dash.jdTable.title": { ko: "공고별 진행 현황", en: "Progress by Job", vi: "Tiến độ theo tin tuyển" },
  "dash.jdTable.count": { ko: "개 공고 · KTC Ops 기준", en: " jobs · from KTC Ops", vi: " tin · theo KTC Ops" },
  "dash.col.jd": { ko: "공고", en: "Job", vi: "Tin tuyển" },
  "dash.col.funnel": { ko: "Ops 단계", en: "Ops Stage", vi: "Giai đoạn Ops" },
  "dash.col.applied": { ko: "지원", en: "Applied", vi: "Ứng tuyển" },
  "dash.col.screened": { ko: "스크리닝 합격", en: "Screened", vi: "Đạt sàng lọc" },
  "dash.col.readyToForward": { ko: "발송 대기", en: "Ready", vi: "Chờ gửi" },
  "dash.col.sent": { ko: "발송", en: "Sent", vi: "Đã gửi" },
  "dash.col.interview": { ko: "면접", en: "Interview", vi: "Phỏng vấn" },
  "dash.col.offer": { ko: "오퍼", en: "Offer", vi: "Offer" },
  "dash.col.matched": { ko: "매칭", en: "Matched", vi: "Match" },
  "dash.col.sheetStatus": { ko: "시트 상태", en: "Sheet Status", vi: "Trạng thái sheet" },
  "dash.closeRemaining": { ko: "잔여 후보 탈락 처리", en: "Reject Remaining", vi: "Loại UV còn lại" },
  "dash.cleared": { ko: "정리 완료", en: "Cleared", vi: "Đã xử lý" },
  "dash.processing": { ko: "처리 중...", en: "Processing...", vi: "Đang xử lý..." },
  "dash.funnel.intake": { ko: "접수", en: "Intake", vi: "Tiếp nhận" },
  "dash.funnel.cvShared": { ko: "서류 전달", en: "CV Shared", vi: "Đã gửi CV" },
  "dash.funnel.interviewScheduled": { ko: "면접 예정", en: "Interview Scheduled", vi: "Đã hẹn PV" },
  "dash.funnel.contract": { ko: "계약 진행", en: "Contract", vi: "Hợp đồng" },
  "dash.funnel.done": { ko: "매칭 완료", en: "Done", vi: "Hoàn tất" },
  "dash.funnel.drop": { ko: "드롭", en: "Drop", vi: "Drop" },
  "dash.sheet.sentToCompany": { ko: "기업 발송", en: "Sent to company", vi: "Đã gửi DN" },
  "dash.sheet.readyToForward": { ko: "발송 대기", en: "Ready to forward", vi: "Chờ gửi DN" },
  "dash.sheet.companyInterviewed": { ko: "기업 면접 완료", en: "Company interviewed", vi: "DN đã PV" },
  "dash.sheet.notSelected": { ko: "미선발", en: "Not selected", vi: "Không được chọn" },
  "dash.sheet.passed": { ko: "합격", en: "Passed", vi: "Đạt" },
  "dash.sheet.rejected": { ko: "탈락", en: "Rejected", vi: "Không đạt" },
  "dash.sheet.interviewing": { ko: "면접 진행", en: "Interviewing", vi: "Đang PV" },
  "dash.sheet.none": { ko: "(상태 없음)", en: "(no status)", vi: "(chưa có)" },

  // 후보자 관리
  "candidates.title": { ko: "후보자 관리", en: "Candidate Management", vi: "Quản lý ứng viên" },
  "candidates.addCandidate": { ko: "후보자 추가", en: "Add Candidate", vi: "Thêm ứng viên" },
  "candidates.syncSheets": { ko: "시트 동기화", en: "Sync Sheets", vi: "Đồng bộ Sheet" },
  "candidates.llmScreening": { ko: "LLM 스크리닝", en: "LLM Screening", vi: "Sàng lọc LLM" },
  "candidates.dedup": { ko: "중복 정리", en: "Dedup", vi: "Loại trùng" },
  "candidates.dedupConfirm": { ko: "중복 후보자를 정리합니다. 진행하시겠습니까?", en: "Remove duplicate candidates. Proceed?", vi: "Xóa ứng viên trùng lặp. Tiếp tục?" },
  "candidates.dedupRunning": { ko: "중복 정리 중...", en: "Deduplicating...", vi: "Đang loại trùng..." },
  "candidates.dedupResult.groups": { ko: "중복 그룹", en: "Duplicate groups", vi: "Nhóm trùng" },
  "candidates.dedupResult.deleted": { ko: "명 삭제", en: " deleted", vi: " đã xóa" },
  "candidates.generateCards": { ko: "카드 생성", en: "Generate Cards", vi: "Tạo thẻ" },
  "candidates.tab.all": { ko: "전체", en: "All", vi: "Tất cả" },
  "candidates.tab.pending": { ko: "스크리닝 대기", en: "Pending Screening", vi: "Chờ sàng lọc" },
  "candidates.tab.aiPassed": { ko: "스크리닝 합격", en: "Screening Passed", vi: "Đạt sàng lọc" },
  "candidates.tab.readyToForward": { ko: "발송 대기", en: "Ready to Forward", vi: "Chờ gửi DN" },
  "candidates.tab.sentToCompany": { ko: "기업 발송", en: "Sent to Company", vi: "Đã gửi DN" },
  "candidates.tab.interviewing": { ko: "면접 진행", en: "Interviewing", vi: "Đang phỏng vấn" },
  "candidates.tab.offer": { ko: "오퍼·계약", en: "Offer & Contract", vi: "Offer & hợp đồng" },
  "candidates.tab.finalPassed": { ko: "매칭 완료 (입사)", en: "Matched (Hired)", vi: "Đã match" },
  "candidates.tab.screeningFailed": { ko: "스크리닝 실패", en: "Screening Failed", vi: "Sàng lọc thất bại" },
  "candidates.tab.rejected": { ko: "불합격", en: "Rejected", vi: "Không đạt" },
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
  "detail.cloneScreen": { ko: "다른 JD로 스크리닝", en: "Screen for another JD", vi: "Sàng lọc cho JD khác" },
  "detail.cloneScreenRun": { ko: "복제 + 스크리닝", en: "Clone + Screen", vi: "Nhân bản + sàng lọc" },
  "detail.memo": { ko: "메모", en: "Memo", vi: "Ghi chú" },
  "detail.memoPlaceholder": { ko: "메모...", en: "Notes...", vi: "Ghi chú..." },

  // 토스트
  "toast.sheetSynced": { ko: "시트 반영됨", en: "Sheet updated", vi: "Đã cập nhật sheet" },
  "toast.sheetRowAdded": { ko: "시트에 행 추가됨", en: "Row added to sheet", vi: "Đã thêm dòng vào sheet" },
  "toast.sheetSkipped": { ko: "시트 미반영", en: "Not in sheet", vi: "Không có trong sheet" },

  // 후보자 단계 액션
  "action.markReadyToForward": { ko: "발송 대기 처리", en: "Mark as Ready to Forward", vi: "Đánh dấu chờ gửi DN" },
  "action.markSentToCompany": { ko: "기업 발송 처리", en: "Mark as Sent to Company", vi: "Đánh dấu đã gửi DN" },
  "action.markInterviewing": { ko: "면접 진행 처리", en: "Mark as Interviewing", vi: "Đánh dấu đang phỏng vấn" },
  "action.markOffer": { ko: "오퍼 진행", en: "Mark as Offer", vi: "Đánh dấu offer" },
  "action.finalPass": { ko: "매칭 완료 (입사 확정)", en: "Mark as Matched", vi: "Đã match" },
  "action.reject": { ko: "불합격", en: "Reject", vi: "Không đạt" },

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
  "jd.addCandidates": { ko: "+ 후보자 추가", en: "+ Add Candidates", vi: "+ Thêm ứng viên" },
  "jd.searchPlaceholder": { ko: "이름, 포지션, 스킬로 검색...", en: "Search by name, position, skills...", vi: "Tìm theo tên, vị trí, kỹ năng..." },
  "jd.noCandidatesFound": { ko: "검색 결과가 없습니다", en: "No candidates found", vi: "Không tìm thấy ứng viên" },
  "jd.addSelected": { ko: "선택한 후보자 추가", en: "Add Selected", vi: "Thêm đã chọn" },
  "jd.alreadyAssigned": { ko: "이미 배정됨", en: "Already assigned", vi: "Đã phân công" },
  "jd.candidateAdded": { ko: "명 추가 완료", en: "candidate(s) added", vi: "ứng viên đã thêm" },
  "jd.section.active": { ko: "모집중", en: "Recruiting", vi: "Đang tuyển" },
  "jd.section.closed": { ko: "마감", en: "Closed", vi: "Đã đóng" },
  "jd.section.unregistered": { ko: "미등록 JD 코드", en: "Unregistered JD codes", vi: "Mã JD chưa đăng ký" },
  "jd.unregisteredHint": { ko: "JD 목록에 없는 코드로 지원한 후보자가 있습니다. JD를 등록하면 목록에서 관리됩니다.", en: "Some candidates applied with codes not in the JD list. Register the JD to manage them here.", vi: "Có ứng viên nộp với mã chưa có trong danh sách JD. Đăng ký JD để quản lý tại đây." },
  "jd.stat.activeJD": { ko: "모집중 JD", en: "Recruiting JDs", vi: "JD đang tuyển" },
  "jd.stat.activeHires": { ko: "모집중 채용 인원", en: "Open Headcount", vi: "Số lượng đang tuyển" },
  "jd.stat.closedJD": { ko: "마감 JD", en: "Closed JDs", vi: "JD đã đóng" },
  "jd.searchJD": { ko: "코드, 회사, 포지션으로 검색...", en: "Search by code, company, position...", vi: "Tìm theo mã, công ty, vị trí..." },
  "jd.viewAllCandidates": { ko: "후보자 전체 보기", en: "View all candidates", vi: "Xem tất cả ứng viên" },
  "jd.viewFullJD": { ko: "JD 전문 보기", en: "View full JD", vi: "Xem JD đầy đủ" },
  "jd.hideFullJD": { ko: "JD 전문 접기", en: "Hide full JD", vi: "Thu gọn JD" },
  "jd.registerJD": { ko: "JD 등록", en: "Register JD", vi: "Đăng ký JD" },
  "jd.deleteWarnCount": { ko: "명의 후보자가 이 JD에 연결되어 있습니다.", en: " candidate(s) are linked to this JD.", vi: " ứng viên đang liên kết với JD này." },
  "jd.deleteWarnKeep": { ko: "삭제해도 후보자 데이터는 남지만, 이 코드는 미등록 코드로 표시됩니다.", en: "Candidate data will remain, but this code will appear as unregistered.", vi: "Dữ liệu ứng viên vẫn còn, nhưng mã này sẽ hiển thị là chưa đăng ký." },
  "jd.addedExisted": { ko: "명은 이미 지원 행이 있어 건너뜀", en: " skipped (row already exists)", vi: " bỏ qua (đã có dòng)" },
  "jd.noJDFound": { ko: "조건에 맞는 JD가 없습니다", en: "No JDs match", vi: "Không có JD phù hợp" },
  "jd.sheetWarn": { ko: "Ops 시트를 읽지 못해 마감 상태가 표시되지 않습니다", en: "Could not read Ops sheet — closed status unavailable", vi: "Không đọc được Ops sheet — không hiển thị trạng thái đóng" },
  "jd.noApplicants": { ko: "아직 지원자가 없습니다", en: "No applicants yet", vi: "Chưa có ứng viên" },
  "jd.form.expIntern": { ko: "인턴", en: "Intern", vi: "Thực tập" },
  "jd.form.expFresher": { ko: "신입", en: "Fresher", vi: "Mới tốt nghiệp" },
  "jd.form.expYears": { ko: "경력 (연차)", en: "Experienced", vi: "Có kinh nghiệm" },
  "jd.form.min": { ko: "최소", en: "Min", vi: "Tối thiểu" },
  "jd.form.max": { ko: "최대", en: "Max", vi: "Tối đa" },
  "jd.form.customInput": { ko: "직접 입력", en: "Custom input", vi: "Tự nhập" },
  "jd.form.presetInput": { ko: "선택 입력", en: "Preset input", vi: "Chọn sẵn" },
  // 권한 안내
  "roles.subtitle": { ko: "등급별 접근 가능한 기능을 안내합니다", en: "Features accessible by each role", vi: "Các tính năng theo từng cấp quyền" },
  "roles.colPermission": { ko: "권한", en: "Permission", vi: "Quyền" },
  "roles.perm.viewTalents": { ko: "인재 카드 열람", en: "View talent cards", vi: "Xem thẻ nhân tài" },
  "roles.perm.dashboard": { ko: "채용 대시보드 · 파이프라인 현황", en: "Recruiting dashboard & pipeline", vi: "Dashboard tuyển dụng & pipeline" },
  "roles.perm.candidates": { ko: "후보자 관리 (단계 변경 · 후보자 추가)", en: "Candidate management (stages, add)", vi: "Quản lý ứng viên (giai đoạn, thêm)" },
  "roles.perm.jd": { ko: "JD 등록 / 수정 / 삭제", en: "JD create / edit / delete", vi: "Tạo / sửa / xóa JD" },
  "roles.perm.talentCards": { ko: "인재 카드 등록 / 수정 / 게시 관리", en: "Talent card create / edit / publish", vi: "Tạo / sửa / đăng thẻ nhân tài" },
  "roles.perm.ops": { ko: "딜리버리 · 인재풀 · 문의 관리", en: "Delivery, talent pool & inquiries", vi: "Delivery, talent pool & liên hệ" },
  "roles.perm.approveUsers": { ko: "사용자 가입 승인 / 거절", en: "Approve / reject signups", vi: "Duyệt / từ chối đăng ký" },
  "roles.perm.dataPipeline": { ko: "시트 동기화 · LLM 스크리닝 · 중복 제거", en: "Sheet sync, LLM screening, dedup", vi: "Đồng bộ sheet, sàng lọc LLM, khử trùng lặp" },
  "roles.perm.manageAdmins": { ko: "관리자 임명 / 해제", en: "Assign / remove admins", vi: "Bổ nhiệm / gỡ quản trị" },
  "roles.note": { ko: "* 관리자 임명은 총 관리자가 사용자 관리에서 할 수 있습니다. 인재 카드 열람은 가입 승인된 사용자만 가능합니다.", en: "* Admin roles are assigned by the super admin in User Management. Talent cards are visible to approved users only.", vi: "* Super Admin bổ nhiệm quản trị trong Quản lý người dùng. Chỉ người dùng đã duyệt mới xem được thẻ nhân tài." },
  // 벌크 액션
  "bulk.selectMode": { ko: "선택 모드", en: "Select Mode", vi: "Chế độ chọn" },
  "bulk.deselectAll": { ko: "선택 해제", en: "Deselect All", vi: "Bỏ chọn" },
  "bulk.selectAll": { ko: "전체 선택", en: "Select All", vi: "Chọn tất cả" },
  "bulk.selected": { ko: "명 선택", en: " selected", vi: " đã chọn" },
  "bulk.changeStage": { ko: "단계 변경", en: "Change Stage", vi: "Đổi giai đoạn" },
  "bulk.assignJD": { ko: "JD 배정", en: "Assign JD", vi: "Gán JD" },
  "bulk.unassigned": { ko: "미배정", en: "Unassigned", vi: "Chưa gán" },
  "bulk.deleteConfirm": { ko: "명을 삭제하시겠습니까? 연결된 인재 카드와 인터뷰 세션도 함께 삭제됩니다.", en: " candidate(s)? Related talent cards and interview sessions will also be deleted.", vi: " ứng viên? Thẻ nhân tài và phiên phỏng vấn liên quan cũng sẽ bị xóa." },
  "bulk.manualStageChange": { ko: "단계 수동 변경", en: "Manual Stage Change", vi: "Đổi giai đoạn thủ công" },
  "bulk.deleteCandidate": { ko: "후보자 삭제", en: "Delete Candidate", vi: "Xóa ứng viên" },
  "bulk.deleting": { ko: "삭제 중...", en: "Deleting...", vi: "Đang xóa..." },
  "bulk.deleteCandidateConfirm": { ko: "을(를) 삭제하시겠습니까? 연결된 인재 카드와 인터뷰 세션도 함께 삭제됩니다.", en: " — Delete this candidate? Related talent cards and interview sessions will also be deleted.", vi: " — Xóa ứng viên này? Thẻ nhân tài và phiên phỏng vấn liên quan cũng sẽ bị xóa." },

  // 상태
  "status.new": { ko: "대기", en: "Pending", vi: "Chờ" },
  "status.passed": { ko: "스크리닝 합격", en: "Screening Passed", vi: "Đạt sàng lọc" },
  "status.ready_to_forward": { ko: "발송 대기", en: "Ready to Forward", vi: "Chờ gửi DN" },
  "status.sent_to_company": { ko: "기업 발송", en: "Sent to Company", vi: "Đã gửi DN" },
  "status.interviewing": { ko: "면접 진행", en: "Interviewing", vi: "Đang phỏng vấn" },
  "status.offer": { ko: "오퍼·계약", en: "Offer", vi: "Offer" },
  // 레거시 AI 인터뷰 상태 (기존 데이터 표시용)
  "status.ai_interview_sent": { ko: "AI 인터뷰 발송", en: "AI Sent", vi: "Đã gửi AI" },
  "status.ai_interview_done": { ko: "AI 인터뷰 완료", en: "AI Done", vi: "AI xong" },
  "status.ai_interview_passed": { ko: "AI 인터뷰 합격", en: "AI Passed", vi: "Đạt PV AI" },
  "status.final_passed": { ko: "매칭 완료", en: "Matched", vi: "Đã match" },
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
