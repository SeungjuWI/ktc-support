import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadAllJDs, resolveJD } from "@/lib/jd-data";
import {
  readQualifiedRows,
  findQualifiedRow,
  updateQualifiedStatus,
  findTabForCompany,
  appendQualifiedRow,
  readEmployees,
  readOpsFunnel,
  appendEmployeeRow,
  normalizeName,
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

// 앱에서 후보자 상태 변경 시 Qualified Candidates 시트에도 반영.
// 기존 행이 있으면 Status 업데이트, 없으면 (기업 발송 시) 해당 기업 탭에 행 자동 추가.
export async function POST(req: NextRequest) {
  const { candidateId } = await req.json();
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("full_name, email, yoe, cv_url, llm_score, applied_job, applied_company, pipeline_status")
    .eq("id", candidateId)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const sheetStatus = PIPELINE_TO_SHEET_STATUS[candidate.pipeline_status];
  if (!sheetStatus) {
    // 시트에 반영할 필요 없는 상태 (new/passed 등)
    return NextResponse.json({ success: true, updated: false, reason: "status not synced to sheet" });
  }

  try {
    // 매칭 완료 → KTC Ops Employee 탭에 입사자 자동 기록 (이미 있으면 스킵)
    let employeeAdded = false;
    if (candidate.pipeline_status === "final_passed") {
      try {
        const employees = await readEmployees();
        const email = (candidate.email || "").trim().toLowerCase();
        const exists = employees.some(
          (e) => (email && e.email.toLowerCase() === email) || normalizeName(e.name) === normalizeName(candidate.full_name)
        );
        if (!exists) {
          const allJDsForOps = await loadAllJDs(getSupabaseAdmin());
          const jdForOps = resolveJD(candidate.applied_job, allJDsForOps);
          const ops = await readOpsFunnel();
          const opsRow = jdForOps ? ops.find((o) => o.jdCode === jdForOps.code) : undefined;
          await appendEmployeeRow({
            category: opsRow?.category,
            code: opsRow?.code,
            company: jdForOps?.company || candidate.applied_company || "",
            position: jdForOps?.position || candidate.applied_job || "",
            name: candidate.full_name,
            email: candidate.email || "",
          });
          employeeAdded = true;
        }
      } catch {
        // Employee 탭 기록 실패해도 Qualified 시트 반영은 계속
      }
    }

    const rows = await readQualifiedRows();
    const row = findQualifiedRow(rows, candidate.email, candidate.full_name);

    if (row) {
      await updateQualifiedStatus(row.tab, row.rowIndex, sheetStatus);
      return NextResponse.json({ success: true, updated: true, tab: row.tab, row: row.rowIndex, status: sheetStatus, employeeAdded });
    }

    // 행이 없음 → 발송 대기/기업 발송 시에만 새 행 자동 추가 (탈락 등은 행 생성 안 함)
    if (!["ready_to_forward", "sent_to_company"].includes(candidate.pipeline_status)) {
      return NextResponse.json({ success: true, updated: false, reason: "not found in sheet" });
    }

    const allJDs = await loadAllJDs(supabase);
    const jd = resolveJD(candidate.applied_job, allJDs);
    const company = jd?.company || candidate.applied_company || "";
    const tab = await findTabForCompany(company);
    if (!tab) {
      return NextResponse.json({
        success: true,
        updated: false,
        reason: `no matching tab for company "${company || "(unknown)"}"`,
      });
    }

    await appendQualifiedRow(tab, {
      company,
      name: candidate.full_name,
      email: candidate.email || "",
      yoe: candidate.yoe || "",
      position: candidate.applied_job || jd?.position || "",
      matchScore: candidate.llm_score != null ? String(candidate.llm_score) : "",
      cvUrl: candidate.cv_url || "",
      status: sheetStatus,
    });
    return NextResponse.json({ success: true, updated: true, appended: true, tab, status: sheetStatus });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sheet update failed" }, { status: 500 });
  }
}
