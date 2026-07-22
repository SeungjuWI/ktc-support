import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateTalentVerification } from "@/lib/create-talent-card";
import { loadAllJDs, resolveJD } from "@/lib/jd-data";
import {
  readQualifiedRows,
  findQualifiedRow,
  updateQualifiedStatus,
  findTabForCompany,
  appendQualifiedRow,
  PIPELINE_TO_SHEET_STATUS,
} from "@/lib/qualified-sheets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(req: NextRequest) {
  const { ids, action, value } = await req.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0 || !action) {
    return NextResponse.json({ success: false, error: "ids and action required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (action === "change_status") {
    const { error } = await supabase
      .from("candidates")
      .update({ pipeline_status: value, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    // talent verification 업데이트
    for (const id of ids) {
      await updateTalentVerification(supabase, id, value);
    }

    // Qualified 시트 일괄 반영 (시트 오류가 나도 앱 상태 변경은 유지)
    let sheetUpdated = 0;
    let sheetAppended = 0;
    const sheetErrors: string[] = [];
    const sheetStatus = PIPELINE_TO_SHEET_STATUS[value];
    if (sheetStatus) {
      try {
        const rows = await readQualifiedRows();
        const { data: cands } = await supabase
          .from("candidates")
          .select("id, full_name, email, yoe, cv_url, llm_score, applied_job, applied_company")
          .in("id", ids);
        const allJDs = await loadAllJDs(supabase);
        for (const c of cands || []) {
          try {
            const row = findQualifiedRow(rows, c.email, c.full_name);
            if (row) {
              await updateQualifiedStatus(row.tab, row.rowIndex, sheetStatus);
              sheetUpdated++;
            } else if (["ready_to_forward", "sent_to_company"].includes(value)) {
              const jd = resolveJD(c.applied_job, allJDs);
              const company = jd?.company || c.applied_company || "";
              const tab = await findTabForCompany(company);
              if (!tab) continue;
              await appendQualifiedRow(tab, {
                company,
                name: c.full_name,
                email: c.email || "",
                yoe: c.yoe || "",
                position: c.applied_job || jd?.position || "",
                matchScore: c.llm_score != null ? String(c.llm_score) : "",
                cvUrl: c.cv_url || "",
                status: sheetStatus,
              });
              sheetAppended++;
            }
          } catch (e) {
            sheetErrors.push(`${c.full_name}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }
      } catch (e) {
        sheetErrors.push(e instanceof Error ? e.message : "sheet read failed");
      }
    }

    return NextResponse.json({ success: true, updated: ids.length, sheetUpdated, sheetAppended, sheetErrors });
  }

  if (action === "assign_jd") {
    const { error } = await supabase
      .from("candidates")
      .update({ applied_job: value || null, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, updated: ids.length });
  }

  if (action === "delete") {
    // 각 후보자의 연관 데이터 삭제
    for (const id of ids) {
      const { data: candidate } = await supabase
        .from("candidates")
        .select("talent_id")
        .eq("id", id)
        .single();

      const { data: sessions } = await supabase
        .from("interview_sessions")
        .select("id")
        .eq("candidate_id", id);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: { id: string }) => s.id);
        await supabase.from("interview_responses").delete().in("session_id", sessionIds);
        await supabase.from("interview_sessions").delete().eq("candidate_id", id);
      }

      if (candidate?.talent_id) {
        await supabase.from("talent_favorites").delete().eq("talent_id", candidate.talent_id);
        await supabase.from("candidates").update({ talent_id: null }).eq("id", id);
        await supabase.from("talents").delete().eq("id", candidate.talent_id);
      }

      await supabase.from("candidates").delete().eq("id", id);
    }
    return NextResponse.json({ success: true, deleted: ids.length });
  }

  return NextResponse.json({ success: false, error: "unknown action" }, { status: 400 });
}
