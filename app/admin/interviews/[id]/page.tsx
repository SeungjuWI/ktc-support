"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminI18n } from "@/lib/admin-i18n";

export default function InterviewDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { t } = useAdminI18n();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDetail(); }, []);

  const fetchDetail = async () => {
    const res = await fetch(`/api/admin/interviews/${params.id}`);
    const json = await res.json();
    setData(json);
    setNote(json.session?.human_review_note || "");
  };

  const updateDecision = async (decision: "pass" | "hold" | "fail") => {
    setSaving(true);
    await fetch(`/api/admin/interviews/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    setSaving(false);
    fetchDetail();
  };

  if (!data) return <div className="py-8 text-[14px] text-gray-500">{t("common.loading")}</div>;
  const { session, responses } = data;

  const scoreColor = (score: number) => {
    if (score >= 7) return "text-status-available";
    if (score >= 4) return "text-blue-500";
    return "text-red-500";
  };

  return (
    <div className="max-w-[800px]">
      <button onClick={() => router.back()} className="text-[13px] text-gray-500 mb-4 hover:text-gray-700 transition-colors duration-100">
        &larr; Back
      </button>

      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-6 mb-6">
        <h1 className="text-[22px] font-medium text-gray-900">{session.candidate_name}</h1>
        <p className="text-[13px] text-gray-500">{session.candidate_email} · {session.candidate_phone}</p>
        <p className="text-[12px] font-mono text-gray-400 mt-1">{session.access_code}</p>

        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
          <div className="text-[28px] font-medium text-blue-500">{session.total_score}/70</div>
          <div className="text-[13px] text-gray-600 mt-1">
            {Math.round((session.total_score / 70) * 100)}% — Suggested: <span className="font-medium">{session.total_score >= 36 ? "PASS" : "FAIL"}</span> (cutoff 36)
          </div>
        </div>

        {session.ai_summary && (
          <div className="mt-4">
            <h3 className="font-medium text-[12px] text-gray-500 uppercase mb-2">AI Summary</h3>
            <p className="text-gray-800 bg-gray-50 p-4 rounded-xl whitespace-pre-wrap text-[14px]">{session.ai_summary}</p>
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <h3 className="font-medium text-[12px] text-gray-500 uppercase">Responses</h3>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(responses || []).map((r: Record<string, any>) => (
          <div key={r.id} className="bg-white border-[0.5px] border-gray-200/60 rounded-xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[12px] text-gray-500">Q{r.question_order}</span>
                <h4 className="font-medium text-[15px] text-gray-900">{r.interview_questions?.category}</h4>
              </div>
              <div className={`text-[24px] font-medium ${scoreColor(r.score)}`}>{r.score}/10</div>
            </div>
            <div className="text-[12px] text-gray-500 mb-2">
              <span className="font-medium">Q:</span> {r.interview_questions?.question_text_en}
            </div>
            {r.audioUrl && <audio controls src={r.audioUrl} className="w-full my-2 h-8" />}
            <div className="text-[13px] space-y-2 mt-2">
              <div>
                <p className="text-gray-500 mb-1 text-[12px]">Transcript ({r.transcript_language}):</p>
                <p className="text-gray-800 italic bg-gray-50 p-2 rounded-lg text-[13px]">&ldquo;{r.transcript}&rdquo;</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1 text-[12px]">AI Reasoning:</p>
                <p className="text-gray-700 text-[13px]">{r.score_reasoning}</p>
              </div>
              <div className="text-[12px] text-gray-400">Duration: {r.duration_seconds}s</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-6">
        <h3 className="font-medium text-[12px] text-gray-500 uppercase mb-3">Human Review</h3>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Your notes..." rows={4}
          className="w-full px-3 py-2 border-[0.5px] border-gray-200 rounded-xl mb-4 text-[14px] outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        <div className="flex gap-2">
          <button onClick={() => updateDecision("pass")} disabled={saving}
            className="flex-1 bg-status-available hover:opacity-90 text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-colors duration-100">
            PASS
          </button>
          <button onClick={() => updateDecision("hold")} disabled={saving}
            className="flex-1 bg-grade-s-text hover:opacity-90 text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-colors duration-100">
            HOLD
          </button>
          <button onClick={() => updateDecision("fail")} disabled={saving}
            className="flex-1 bg-red-500 hover:opacity-90 text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-colors duration-100">
            FAIL
          </button>
        </div>
        {session.human_decision && (
          <p className="mt-3 text-[13px] text-gray-500">
            Current decision: <span className={`font-medium ${
              session.human_decision === "pass" ? "text-status-available" :
              session.human_decision === "fail" ? "text-red-500" :
              "text-grade-s-text"
            }`}>{session.human_decision.toUpperCase()}</span>
            {session.human_reviewed_at && ` (reviewed ${new Date(session.human_reviewed_at).toLocaleString()})`}
          </p>
        )}
      </div>
    </div>
  );
}
