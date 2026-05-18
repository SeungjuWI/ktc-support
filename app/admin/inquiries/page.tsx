"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Talent, toInitials } from "@/lib/types";
import { TalentDetailModal } from "@/app/components/talent/TalentDetailModal";
import { availabilityKR } from "@/lib/i18n";

const STAGES = [
  { key: "received", label: "접수" },
  { key: "candidate_check", label: "후보자 확인" },
  { key: "scheduling", label: "면접 조율" },
  { key: "interviewed", label: "면접 완료" },
  { key: "offer_accepted", label: "채용 확정" },
  { key: "onboarded", label: "합류 완료" },
] as const;

type Stage = typeof STAGES[number]["key"] | "cancelled" | "rejected";

type InterviewRequest = {
  id: string;
  talent_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  message: string | null;
  status: Stage;
  interview_date: string | null;
  created_at: string;
};

type LogEntry = {
  id: string;
  request_id: string;
  actor_email: string | null;
  action: string;
  note: string | null;
  created_at: string;
};

type RequestWithTalent = InterviewRequest & { talent: Talent | null };

function getStageIndex(status: Stage): number {
  if (status === "cancelled" || status === "rejected") return -1;
  return STAGES.findIndex((s) => s.key === status);
}

/** 각 단계별 다음 액션 버튼 정의 */
function getStageActions(status: Stage): { label: string; next: Stage; style: "primary" | "danger" | "secondary" }[] {
  switch (status) {
    case "received":
      return [{ label: "후보자 확인 시작", next: "candidate_check", style: "primary" }];
    case "candidate_check":
      return [{ label: "면접 조율 시작", next: "scheduling", style: "primary" }];
    case "scheduling":
      return [{ label: "면접 완료", next: "interviewed", style: "primary" }];
    case "interviewed":
      return [
        { label: "채용 확정", next: "offer_accepted", style: "primary" },
        { label: "불합격", next: "rejected", style: "danger" },
      ];
    case "offer_accepted":
      return [{ label: "합류 완료", next: "onboarded", style: "primary" }];
    default:
      return [];
  }
}

/** 이전 단계 가져오기 */
function getPrevStage(status: Stage): Stage | null {
  const idx = getStageIndex(status);
  if (idx <= 0) return null;
  return STAGES[idx - 1].key;
}

/** 리스트용 미니 프로그레스 바 */
function MiniProgress({ status }: { status: Stage }) {
  const idx = getStageIndex(status);
  if (status === "cancelled") return <span className="text-[11px] text-gray-400">취소됨</span>;
  if (status === "rejected") return <span className="text-[11px] text-red-400">불합격</span>;
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-[2px]">
        {STAGES.map((_, i) => (
          <div key={i} className={`w-4 h-[5px] rounded-full ${i <= idx ? "bg-blue-500" : "bg-gray-200"}`} />
        ))}
      </div>
      <span className="text-[11px] text-gray-500 ml-1.5">{STAGES[idx]?.label}</span>
    </div>
  );
}

/** 상세용 프로그레스 바 (읽기 전용) */
function DetailProgress({ status }: { status: Stage }) {
  const idx = getStageIndex(status);
  if (status === "cancelled" || status === "rejected") return null;
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-4">
      <div className="relative flex items-center justify-between">
        <div className="absolute top-[10px] left-[10px] right-[10px] h-[3px] bg-gray-200 rounded-full" />
        <div
          className="absolute top-[10px] left-[10px] h-[3px] bg-blue-500 rounded-full transition-all duration-200"
          style={{ width: `calc(${(idx / (STAGES.length - 1)) * 100}% - 20px * ${idx / (STAGES.length - 1)})` }}
        />
        {STAGES.map((stage, i) => {
          const isPast = i < idx;
          const isCurrent = i === idx;
          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                isPast || isCurrent ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"
              }`}>
                {(isPast || isCurrent) && (
                  <svg className="w-full h-full p-[3px]" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className={`text-[10px] mt-1.5 whitespace-nowrap ${
                isCurrent ? "text-blue-500 font-medium" : isPast ? "text-gray-500" : "text-gray-400"
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InquiriesPage() {
  const [requests, setRequests] = useState<RequestWithTalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed" | "ended">("active");
  const [selectedReq, setSelectedReq] = useState<RequestWithTalent | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [note, setNote] = useState("");
  const [myEmail, setMyEmail] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setMyEmail(session.user.email || "");
    await loadRequests();
  }

  async function loadRequests() {
    const { data: reqs, error } = await supabase
      .from("interview_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !reqs) { setLoading(false); return; }

    const talentIds = Array.from(new Set(reqs.map((r: InterviewRequest) => r.talent_id)));
    const { data: talents } = await supabase.from("talents").select("*").in("id", talentIds);

    const talentMap = new Map<string, Talent>();
    if (talents) talents.forEach((t: Talent) => talentMap.set(t.id, t));

    const merged: RequestWithTalent[] = reqs.map((r: InterviewRequest) => ({
      ...r,
      talent: talentMap.get(r.talent_id) || null,
    }));

    setRequests(merged);
    setLoading(false);
  }

  async function loadLogs(requestId: string) {
    const { data } = await supabase
      .from("interview_request_logs")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    setLogs((data as LogEntry[]) || []);
  }

  async function changeStage(req: RequestWithTalent, newStatus: Stage) {
    if (req.status === newStatus) return;
    await supabase
      .from("interview_requests")
      .update({ status: newStatus })
      .eq("id", req.id);

    const updated = { ...req, status: newStatus };
    setSelectedReq(updated);
    setRequests((prev) => prev.map((r) => r.id === req.id ? updated : r));
  }

  async function saveInterviewDate(req: RequestWithTalent, date: string | null) {
    await supabase
      .from("interview_requests")
      .update({ interview_date: date || null })
      .eq("id", req.id);

    const updated = { ...req, interview_date: date };
    setSelectedReq(updated);
    setRequests((prev) => prev.map((r) => r.id === req.id ? updated : r));
  }

  async function addNote(requestId: string) {
    if (!note.trim()) return;
    await supabase.from("interview_request_logs").insert({
      request_id: requestId,
      actor_email: myEmail,
      action: "메모",
      note: note.trim(),
    });
    setNote("");
    await loadLogs(requestId);
  }

  function openDetail(req: RequestWithTalent) {
    setSelectedReq(req);
    loadLogs(req.id);
  }

  const isActive = (r: RequestWithTalent) => r.status !== "cancelled" && r.status !== "rejected" && r.status !== "onboarded";
  const filtered = requests.filter((r) => {
    if (tab === "active") return isActive(r);
    if (tab === "completed") return r.status === "onboarded";
    return r.status === "cancelled" || r.status === "rejected";
  });

  const counts = {
    active: requests.filter(isActive).length,
    completed: requests.filter((r) => r.status === "onboarded").length,
    ended: requests.filter((r) => r.status === "cancelled" || r.status === "rejected").length,
  };

  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 tracking-tight mb-1">인재 문의</h1>
      <p className="text-[14px] text-gray-500 mb-6">채용 파이프라인 관리</p>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "active", label: "진행중" },
          { key: "completed", label: "합류 완료" },
          { key: "ended", label: "취소/불합격" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-[14px] py-[7px] rounded-full text-[13px] transition-colors ${
              tab === t.key
                ? "bg-gray-900 text-white"
                : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label} {counts[t.key] > 0 && <span className="ml-1">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-16"><p className="text-[14px] text-gray-500">로딩 중...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16"><p className="text-[14px] text-gray-500">해당 문의가 없습니다</p></div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              onClick={() => openDetail(req)}
              className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 cursor-pointer hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2.5">
                <div>
                  <p className="text-[15px] font-medium text-gray-900">
                    {req.contact_name}
                    <span className="text-[13px] font-normal text-gray-500"> · {req.company_name}</span>
                  </p>
                  {req.talent && (
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      → {req.talent.role} · {req.talent.years_exp}년차 · OVR {req.talent.ovr_score}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0">
                  {new Date(req.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MiniProgress status={req.status} />
                {req.interview_date && getStageIndex(req.status) >= 2 && (
                  <span className="text-[11px] text-blue-500 font-medium flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="12" height="12" rx="2" />
                      <path d="M2 7h12M5 1v3M11 1v3" />
                    </svg>
                    면접 {new Date(req.interview_date + "T00:00:00").toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  </span>
                )}
                {!req.interview_date && (req.status === "candidate_check" || req.status === "scheduling") && (
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="12" height="12" rx="2" />
                      <path d="M2 7h12M5 1v3M11 1v3" />
                    </svg>
                    면접 미정
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 패널 */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center" onClick={() => setSelectedReq(null)}>
          <div
            className="bg-white rounded-[20px] w-full max-w-[520px] mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-[18px] font-medium text-gray-900">문의 상세</h2>
              <button onClick={() => setSelectedReq(null)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-[10px]">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#6B7684" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 5l8 8M13 5l-8 8" />
                </svg>
              </button>
            </div>

            <div className="px-6 pb-6">
              {/* 요청자 */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                <p className="text-[11px] text-gray-500 mb-1">요청자</p>
                <p className="text-[14px] font-medium text-gray-900">{selectedReq.contact_name} · {selectedReq.company_name}</p>
                <p className="text-[13px] text-gray-500">{selectedReq.contact_email}</p>
              </div>

              {/* 인재 */}
              {selectedReq.talent && (
                <div
                  className="bg-gray-50 rounded-xl px-4 py-3 mb-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setSelectedTalent(selectedReq.talent)}
                >
                  <p className="text-[11px] text-gray-500 mb-2">요청 대상</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-[12px] font-medium text-blue-500">{toInitials(selectedReq.talent.name)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-gray-900">{selectedReq.talent.role} · {selectedReq.talent.years_exp}년차</p>
                      <p className="text-[12px] text-gray-500">OVR {selectedReq.talent.ovr_score} · {availabilityKR[selectedReq.talent.availability]}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#B0B8C1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4" /></svg>
                  </div>
                </div>
              )}

              {/* 메시지 */}
              {selectedReq.message && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                  <p className="text-[11px] text-gray-500 mb-1">요청 메시지</p>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{selectedReq.message}</p>
                </div>
              )}

              {/* 프로그레스 바 (읽기 전용) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] text-gray-500">진행 단계</p>
                  {selectedReq.status !== "cancelled" && selectedReq.status !== "rejected" ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                    >
                      취소 처리
                    </button>
                  ) : (
                    <button
                      onClick={() => changeStage(selectedReq, "received")}
                      className="text-[11px] text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      다시 진행
                    </button>
                  )}
                </div>

                {selectedReq.status === "cancelled" ? (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                    <p className="text-[13px] text-gray-400">취소된 문의입니다</p>
                  </div>
                ) : selectedReq.status === "rejected" ? (
                  <div className="bg-red-50 rounded-xl px-4 py-3 text-center">
                    <p className="text-[13px] text-red-400">불합격 처리된 문의입니다</p>
                  </div>
                ) : (
                  <>
                    <DetailProgress status={selectedReq.status} />

                    {/* 면접일 (면접 조율 단계) */}
                    {selectedReq.status === "scheduling" && (
                      <div className="mt-3">
                        <p className="text-[12px] text-gray-500 mb-2">면접 예정일</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={selectedReq.interview_date || ""}
                            onChange={(e) => saveInterviewDate(selectedReq, e.target.value)}
                            className="flex-1 px-3.5 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-900 outline-none focus:border-blue-500 transition-colors"
                          />
                          {selectedReq.interview_date && (
                            <button
                              onClick={() => saveInterviewDate(selectedReq, null)}
                              className="px-3 py-2.5 text-[12px] text-gray-400 hover:text-red-500 transition-colors"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    {getStageActions(selectedReq.status).length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {/* 이전 단계 */}
                        {getPrevStage(selectedReq.status) && (
                          <button
                            onClick={() => changeStage(selectedReq, getPrevStage(selectedReq.status)!)}
                            className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-[13px] font-medium hover:bg-gray-200 transition-colors"
                          >
                            ← 이전
                          </button>
                        )}
                        {getStageActions(selectedReq.status).map((action) => (
                          <button
                            key={action.next}
                            onClick={() => changeStage(selectedReq, action.next)}
                            className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors active:scale-[0.98] ${
                              action.style === "primary"
                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                : action.style === "danger"
                                  ? "bg-red-50 text-red-500 hover:bg-red-100"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 메모 */}
              <div className="mb-4">
                <p className="text-[12px] text-gray-500 mb-2">메모</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addNote(selectedReq.id); }}
                    placeholder="메모 남기기 (예: 5/20 면접 예정)"
                    className="flex-1 px-3.5 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-900 outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
                  />
                  <button
                    onClick={() => addNote(selectedReq.id)}
                    disabled={!note.trim()}
                    className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-[13px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
                  >
                    추가
                  </button>
                </div>
              </div>

              {/* 메모 히스토리 */}
              {logs.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex flex-col gap-2.5">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-[7px] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[13px] text-gray-700">{log.note || log.action}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {log.actor_email && <>{log.actor_email} · </>}
                            {new Date(log.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 취소 확인 팝업 */}
      {showCancelConfirm && selectedReq && (
        <div className="fixed inset-0 z-[60] bg-black/45 flex items-center justify-center" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[340px] mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8590C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <p className="text-[16px] font-medium text-gray-900 mb-1">채용 과정을 취소하시겠습니까?</p>
              <p className="text-[13px] text-gray-500">이 문의의 진행 상태가 취소로 변경됩니다.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-[14px] font-medium active:scale-[0.98] transition"
              >
                돌아가기
              </button>
              <button
                onClick={() => {
                  changeStage(selectedReq, "cancelled");
                  setShowCancelConfirm(false);
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[14px] font-medium hover:bg-red-600 active:scale-[0.98] transition"
              >
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인재 상세 모달 */}
      {selectedTalent && (
        <TalentDetailModal talent={selectedTalent} onClose={() => setSelectedTalent(null)} />
      )}
    </div>
  );
}
