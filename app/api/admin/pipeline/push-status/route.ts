import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  readQualifiedRows,
  findQualifiedRow,
  updateQualifiedStatus,
  PIPELINE_TO_SHEET_STATUS,
} from "@/lib/qualified-sheets";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 앱에서 후보자 상태 변경 시 Qualified Candidates 시트에도 반영
export async function POST(req: NextRequest) {
  const { candidateId } = await req.json();
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("full_name, email, pipeline_status")
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
    const rows = await readQualifiedRows();
    const row = findQualifiedRow(rows, candidate.email, candidate.full_name);
    if (!row) {
      return NextResponse.json({ success: true, updated: false, reason: "not found in sheet" });
    }
    await updateQualifiedStatus(row.tab, row.rowIndex, sheetStatus);
    return NextResponse.json({ success: true, updated: true, tab: row.tab, row: row.rowIndex, status: sheetStatus });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sheet update failed" }, { status: 500 });
  }
}
