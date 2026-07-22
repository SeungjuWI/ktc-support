/**
 * Legacy 시트 데이터 → candidates 테이블 벌크 임포트
 *
 * 사용법:
 *   1. scripts/legacy-data.tsv 에 시트 데이터를 탭 구분으로 붙여넣기
 *   2. npx tsx scripts/import-legacy-candidates.ts
 *   3. --dry-run 플래그로 미리보기 가능: npx tsx scripts/import-legacy-candidates.ts --dry-run
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DRY_RUN = process.argv.includes("--dry-run");

// --- 시트 컬럼 인덱스 (0-based, 탭 구분) ---
// ID | Full Name | Email | Phone | City | University | Grad. Year | Position | YOE (yrs) | CV Link | Github/Port | Source | Submitted Date | Job Application | CV Score | CV Status | Test Score | Test Status | Note | Interview Date | PIC | Phone Score | Phone Status | Int. Note | CURRENT STAGE | Dup. Flag
const COL = {
  ID: 0,
  FULL_NAME: 1,
  EMAIL: 2,
  PHONE: 3,
  CITY: 4,
  UNIVERSITY: 5,
  GRAD_YEAR: 6,
  POSITION: 7,
  YOE: 8,
  CV_LINK: 9,
  GITHUB: 10,
  SOURCE: 11,
  SUBMITTED_DATE: 12,
  JOB_APPLICATION: 13,
  CV_SCORE: 14,
  CV_STATUS: 15,
  TEST_SCORE: 16,
  TEST_STATUS: 17,
  NOTE: 18,
  INTERVIEW_DATE: 19,
  PIC: 20,
  PHONE_SCORE: 21,
  PHONE_STATUS: 22,
  INT_NOTE: 23,
  CURRENT_STAGE: 24,
  DUP_FLAG: 25,
};

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
  // withdraw 케이스
  if (note && /withdraw/i.test(note)) return "rejected";

  // CV 스크리닝 안 된 경우
  if (cvScore === null) return "new";

  // CV 불합격
  if (cvScore < 70) return "screening_failed";

  // CV 합격, 폰인터뷰 없음
  if (phoneScore === null) return "passed";

  // 폰인터뷰 합격 (>=36) → ai_interview_passed로 매핑
  if (phoneScore >= 36) return "passed";

  // 폰인터뷰 불합격
  return "rejected";
}

interface ParsedCandidate {
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  university: string | null;
  graduation_year: string | null;
  position: string | null;
  yoe: string | null;
  cv_url: string | null;
  portfolio_url: string | null;
  source: string;
  applied_date: string | null;
  applied_job: string | null;
  pipeline_status: string;
  llm_score: number | null;
  phone_score: number | null;
  phone_interview_date: string | null;
  phone_interviewer: string | null;
  phone_interview_note: string | null;
  rejection_reason: string | null;
  sheet_source: string;
  sheet_row_identifier: string;
}

function parseLine(cols: string[]): ParsedCandidate | null {
  const fullName = clean(cols[COL.FULL_NAME]);
  if (!fullName) return null;

  const sheetId = clean(cols[COL.ID]);
  if (!sheetId) return null;

  const email = clean(cols[COL.EMAIL]);
  const cvScore = parseScore(cols[COL.CV_SCORE]);
  const phoneScore = parseScore(cols[COL.PHONE_SCORE]);
  const note = clean(cols[COL.NOTE]);
  const intNote = clean(cols[COL.INT_NOTE]);

  const combinedNote = [note, intNote].filter(Boolean).join(" | ") || null;
  const pipelineStatus = derivePipelineStatus(cvScore, phoneScore, note);

  let rejectionReason: string | null = null;
  if (pipelineStatus === "screening_failed" || pipelineStatus === "rejected") {
    rejectionReason = combinedNote;
  }

  return {
    full_name: fullName,
    email,
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
    rejection_reason: rejectionReason,
    sheet_source: "legacy-sheet",
    sheet_row_identifier: `legacy-${sheetId}`,
  };
}

async function main() {
  const tsvPath = path.join(__dirname, "legacy-data.tsv");
  if (!fs.existsSync(tsvPath)) {
    console.error(`\nlegacy-data.tsv 파일이 없습니다.`);
    console.error(`시트 데이터를 scripts/legacy-data.tsv 에 붙여넣기 하세요.\n`);
    console.error(`첫 줄은 헤더(ID, Full Name, Email, ...)여야 합니다.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(tsvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  // 첫 몇 줄은 헤더 — "ID" 로 시작하는 줄 찾기
  let dataStartIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const firstCol = lines[i].split("\t")[0].trim();
    if (firstCol === "ID") {
      dataStartIdx = i + 1;
      break;
    }
  }

  // 중복 헤더 행 건너뛰기 (시트에 ID 헤더가 두 번 나옴)
  const dataLines = lines.slice(dataStartIdx).filter((l) => {
    const firstCol = l.split("\t")[0].trim();
    return firstCol !== "ID" && firstCol !== "";
  });

  console.log(`\n총 ${dataLines.length}줄 데이터 발견 (헤더 제외)\n`);

  // 파싱
  const candidates: ParsedCandidate[] = [];
  const seenIds = new Set<string>();
  let skippedDup = 0;
  let parseErrors = 0;

  for (const line of dataLines) {
    const cols = line.split("\t");
    const parsed = parseLine(cols);
    if (!parsed) {
      parseErrors++;
      continue;
    }

    // 시트 내 중복 ID 제거 (같은 ID가 여러 번 나옴)
    if (seenIds.has(parsed.sheet_row_identifier)) {
      skippedDup++;
      continue;
    }
    seenIds.add(parsed.sheet_row_identifier);
    candidates.push(parsed);
  }

  // 통계
  const stats = {
    total: candidates.length,
    new: 0,
    passed: 0,
    ai_interview_passed: 0,
    screening_failed: 0,
    rejected: 0,
  };
  for (const c of candidates) {
    const key = c.pipeline_status as keyof typeof stats;
    if (key in stats) (stats[key] as number)++;
  }

  console.log(`파싱 결과:`);
  console.log(`  유효 후보자: ${candidates.length}`);
  console.log(`  시트 내 중복 스킵: ${skippedDup}`);
  console.log(`  파싱 실패: ${parseErrors}`);
  console.log(`\nPipeline 분류:`);
  console.log(`  new (스크리닝 전): ${stats.new}`);
  console.log(`  passed (CV 합격, 인터뷰 전): ${stats.passed}`);
  console.log(`  ai_interview_passed (인터뷰 합격): ${stats.ai_interview_passed}`);
  console.log(`  screening_failed (CV 불합격): ${stats.screening_failed}`);
  console.log(`  rejected (인터뷰 불합격/withdraw): ${stats.rejected}`);

  if (DRY_RUN) {
    console.log(`\n--dry-run 모드: DB 삽입 없이 종료합니다.`);
    console.log(`샘플 데이터 (처음 3건):`);
    for (const c of candidates.slice(0, 3)) {
      console.log(JSON.stringify(c, null, 2));
    }
    return;
  }

  // DB에 이미 있는 이메일 조회 (중복 체크)
  console.log(`\nDB 기존 후보자 이메일 조회 중...`);
  const { data: existing } = await supabase
    .from("candidates")
    .select("email, sheet_row_identifier")
    .not("email", "is", null);

  const existingEmails = new Set(
    (existing || []).map((e: { email: string }) => e.email?.toLowerCase())
  );
  const existingSheetIds = new Set(
    (existing || [])
      .filter((e: { sheet_row_identifier: string | null }) => e.sheet_row_identifier)
      .map((e: { sheet_row_identifier: string }) => e.sheet_row_identifier)
  );

  // 중복 필터링
  const toInsert = candidates.filter((c) => {
    // sheet_row_identifier 중복
    if (existingSheetIds.has(c.sheet_row_identifier)) return false;
    // 이메일 중복
    if (c.email && existingEmails.has(c.email.toLowerCase())) return false;
    return true;
  });

  const dbDupCount = candidates.length - toInsert.length;
  console.log(`DB 중복: ${dbDupCount}건 스킵`);
  console.log(`삽입 대상: ${toInsert.length}건\n`);

  if (toInsert.length === 0) {
    console.log("삽입할 데이터가 없습니다.");
    return;
  }

  // 배치 삽입 (50건씩)
  const BATCH = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from("candidates").insert(batch);

    if (error) {
      console.error(`배치 ${i}-${i + batch.length} 에러:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    process.stdout.write(`\r진행: ${inserted + errors}/${toInsert.length} (성공: ${inserted}, 실패: ${errors})`);
  }

  console.log(`\n\n완료!`);
  console.log(`  삽입: ${inserted}건`);
  console.log(`  실패: ${errors}건`);
  console.log(`  DB 중복 스킵: ${dbDupCount}건`);
}

main().catch(console.error);
