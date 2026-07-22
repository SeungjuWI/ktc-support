import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function clean(val: string | undefined): string | null {
  if (!val) return null;
  const v = val.trim();
  if (v === "" || v === "-" || v === "#ERROR!" || v === "#REF!") return null;
  return v;
}

function parseScore(val: string | undefined): number | null {
  const v = clean(val);
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : Math.round(n);
}

function derivePipelineStatus(
  cvScore: number | null,
  phoneScore: number | null,
  note: string | null
): string {
  if (note && /withdraw/i.test(note)) return "rejected";
  if (cvScore === null) return "new";
  if (cvScore < 70) return "screening_failed";
  if (phoneScore === null) return "passed";
  if (phoneScore >= 36) return "passed";
  return "rejected";
}

// 컬럼 인덱스
const COL = {
  ID: 0, FULL_NAME: 1, EMAIL: 2, PHONE: 3, CITY: 4, UNIVERSITY: 5,
  GRAD_YEAR: 6, POSITION: 7, YOE: 8, CV_LINK: 9, GITHUB: 10,
  SOURCE: 11, SUBMITTED_DATE: 12, JOB_APPLICATION: 13,
  CV_SCORE: 14, CV_STATUS: 15, TEST_SCORE: 16, TEST_STATUS: 17,
  NOTE: 18, INTERVIEW_DATE: 19, PIC: 20,
  PHONE_SCORE: 21, PHONE_STATUS: 22, INT_NOTE: 23,
  CURRENT_STAGE: 24, DUP_FLAG: 25,
};

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const { tsvData } = await req.json();

  if (!tsvData || typeof tsvData !== "string") {
    return NextResponse.json({ error: "tsvData is required" }, { status: 400 });
  }

  const lines = tsvData.split("\n").filter((l: string) => l.trim());

  // 헤더 줄 찾기 & 스킵
  let dataStartIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const firstCol = lines[i].split("\t")[0].trim();
    if (firstCol === "ID") {
      dataStartIdx = i + 1;
      break;
    }
  }

  const dataLines = lines.slice(dataStartIdx).filter((l: string) => {
    const firstCol = l.split("\t")[0].trim();
    // 헤더 행, 빈 행, 숫자가 아닌 ID 행 스킵 (pass:>=70 같은 줄 제거)
    if (firstCol === "ID" || firstCol === "" || firstCol === "F") return false;
    if (!/^\d+$/.test(firstCol)) return false;
    return true;
  });

  // 파싱
  const seenIds = new Set<string>();
  const candidates: Record<string, unknown>[] = [];
  let parseErrors = 0;

  for (const line of dataLines) {
    const cols = line.split("\t");
    const fullName = clean(cols[COL.FULL_NAME]);
    const sheetId = clean(cols[COL.ID]);
    if (!fullName || !sheetId) { parseErrors++; continue; }

    const rowKey = `legacy-${sheetId}`;
    if (seenIds.has(rowKey)) continue;
    seenIds.add(rowKey);

    const cvScore = parseScore(cols[COL.CV_SCORE]);
    const phoneScore = parseScore(cols[COL.PHONE_SCORE]);
    const note = clean(cols[COL.NOTE]);
    const intNote = clean(cols[COL.INT_NOTE]);
    const combinedNote = [note, intNote].filter(Boolean).join(" | ") || null;
    const pipelineStatus = derivePipelineStatus(cvScore, phoneScore, note);

    candidates.push({
      full_name: fullName,
      email: clean(cols[COL.EMAIL]),
      phone: clean(cols[COL.PHONE]),
      city: clean(cols[COL.CITY]),
      university: clean(cols[COL.UNIVERSITY]),
      graduation_year: clean(cols[COL.GRAD_YEAR]),
      position: clean(cols[COL.POSITION]),
      yoe: clean(cols[COL.YOE]),
      cv_url: clean(cols[COL.CV_LINK]),
      portfolio_url: clean(cols[COL.GITHUB]),
      source: "legacy-sheet",
      applied_date: clean(cols[COL.SUBMITTED_DATE]),
      applied_job: clean(cols[COL.JOB_APPLICATION]),
      pipeline_status: pipelineStatus,
      llm_score: cvScore,
      phone_score: phoneScore,
      phone_interview_date: clean(cols[COL.INTERVIEW_DATE]),
      phone_interviewer: clean(cols[COL.PIC]),
      phone_interview_note: combinedNote,
      rejection_reason: (pipelineStatus === "screening_failed" || pipelineStatus === "rejected") ? combinedNote : null,
      sheet_source: "legacy-sheet",
      sheet_row_identifier: rowKey,
    });
  }

  // DB 기존 이메일 조회 (중복 체크)
  const { data: existing } = await supabase
    .from("candidates")
    .select("email, sheet_row_identifier");

  const existingEmails = new Set(
    (existing || [])
      .filter((e: { email: string | null }) => e.email)
      .map((e: { email: string }) => e.email.toLowerCase())
  );
  const existingSheetIds = new Set(
    (existing || [])
      .filter((e: { sheet_row_identifier: string | null }) => e.sheet_row_identifier)
      .map((e: { sheet_row_identifier: string }) => e.sheet_row_identifier)
  );

  const toInsert = candidates.filter((c) => {
    if (existingSheetIds.has(c.sheet_row_identifier as string)) return false;
    if (c.email && existingEmails.has((c.email as string).toLowerCase())) return false;
    return true;
  });

  const dbDupCount = candidates.length - toInsert.length;

  // 배치 삽입
  const BATCH = 50;
  let inserted = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from("candidates").insert(batch);
    if (error) {
      errors += batch.length;
      errorMessages.push(error.message);
    } else {
      inserted += batch.length;
    }
  }

  // 통계
  const stats = { new: 0, passed: 0, ai_interview_passed: 0, screening_failed: 0, rejected: 0 };
  for (const c of toInsert) {
    const key = c.pipeline_status as keyof typeof stats;
    if (key in stats) stats[key]++;
  }

  return NextResponse.json({
    parsed: candidates.length,
    dbDuplicate: dbDupCount,
    inserted,
    errors,
    parseErrors,
    stats,
    errorMessages: errorMessages.slice(0, 5),
  });
}
