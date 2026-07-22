import { google } from "googleapis";

// KTC 2026 — Qualified Candidates (서비스 계정 편집자 공유됨)
const QUALIFIED_SHEET_ID =
  process.env.QUALIFIED_SHEET_ID || "1jkHaMY6CM4b-Y_VQlqwULVujqdFPsAhISRVl2TSqfNo";
// 2026 KTC Ops (서비스 계정 뷰어 공유됨 — 읽기 전용)
const KTC_OPS_SHEET_ID =
  process.env.KTC_OPS_SHEET_ID || "1opr9KoR7KRZ31CJDNGM63xbA2rPZjPuNaG6eeLPTXjM";

function getSheets(write = false) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    },
    scopes: [
      write
        ? "https://www.googleapis.com/auth/spreadsheets"
        : "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
  return google.sheets({ version: "v4", auth });
}

// 기업 탭이 아닌 탭 (파싱 제외)
const SKIP_TABS = new Set(["Overview", "Sheet16", "INTERVIEW TRACKING"]);

export interface QualifiedRow {
  tab: string; // 탭 이름 (기업명)
  rowIndex: number; // 시트 상 1-based 행 번호 (쓰기 시 사용)
  company: string;
  name: string;
  email: string; // "영어 이름" 컬럼에 이메일이 들어있는 관행
  position: string;
  matchScore: string;
  status: string;
  note: string;
  dateUpdated: string;
}

interface TabHeader {
  headerRow: number; // 1-based
  cols: Record<string, number>; // 필드 → 0-based 컬럼 인덱스
}

const HEADER_ALIASES: Record<string, string[]> = {
  company: ["기업명"],
  name: ["이름", "Name", "Tên ứng viên"],
  email: ["영어 이름(공란 가능)", "영어 이름", "Email", "Gmail"],
  yoe: ["경력"],
  position: ["지원 포지션", "Applied Job"],
  matchScore: ["매칭점수"],
  cvUrl: ["이력서_파일ID(구드 링크)", "이력서_파일ID", "CV"],
  status: ["Status"],
  note: ["Note", "Ghi chú"],
  dateUpdated: ["Date updated"],
};

function detectHeader(values: string[][]): TabHeader | null {
  for (let r = 0; r < Math.min(values.length, 10); r++) {
    const row = values[r].map((c) => (c || "").trim());
    if (!row.includes("Status")) continue;
    if (!row.some((c) => HEADER_ALIASES.company.includes(c) || HEADER_ALIASES.name.includes(c))) continue;
    const cols: Record<string, number> = {};
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      for (const alias of aliases) {
        const idx = row.indexOf(alias);
        if (idx >= 0) {
          cols[field] = idx;
          break;
        }
      }
    }
    return { headerRow: r + 1, cols };
  }
  return null;
}

function parseTab(tab: string, values: string[][]): QualifiedRow[] {
  const header = detectHeader(values);
  if (!header || header.cols.name === undefined) return [];
  const rows: QualifiedRow[] = [];
  const get = (row: string[], field: string) =>
    header.cols[field] !== undefined ? (row[header.cols[field]] || "").trim() : "";

  for (let r = header.headerRow; r < values.length; r++) {
    const row = values[r] || [];
    const name = get(row, "name");
    // 섹션 제목(병합 셀)·빈 행·중첩 헤더 행 스킵
    if (!name || name === "이름" || name.startsWith("[merged]")) continue;
    rows.push({
      tab,
      rowIndex: r + 1,
      company: get(row, "company") || tab,
      name,
      email: get(row, "email"),
      position: get(row, "position"),
      matchScore: get(row, "matchScore"),
      status: get(row, "status"),
      note: get(row, "note"),
      dateUpdated: get(row, "dateUpdated"),
    });
  }
  return rows;
}

// Qualified Candidates 시트 전체(기업 탭) 읽기
export async function readQualifiedRows(): Promise<QualifiedRow[]> {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: QUALIFIED_SHEET_ID,
    fields: "sheets.properties.title",
  });
  const tabs = (meta.data.sheets || [])
    .map((s) => s.properties?.title || "")
    .filter((t) => t && !SKIP_TABS.has(t));

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: QUALIFIED_SHEET_ID,
    ranges: tabs.map((t) => `'${t}'!A1:T500`),
  });

  const all: QualifiedRow[] = [];
  (res.data.valueRanges || []).forEach((vr, i) => {
    all.push(...parseTab(tabs[i], (vr.values as string[][]) || []));
  });
  return all;
}

export interface OpsFunnelRow {
  category: string; // KR / Remote
  funnel: string; // "1. Intake" ~ "9. Done" / "Drop"
  code: string; // K1, R1 ...
  jdCode: string; // VN Code = JD 코드 (FPT401, NX501 ...)
  company: string;
  position: string;
}

// KTC Ops — Matching Status 탭에서 공고별 퍼널 상태 읽기
export async function readOpsFunnel(): Promise<OpsFunnelRow[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: KTC_OPS_SHEET_ID,
    range: "'Matching Status'!A1:S300",
  });
  const values = (res.data.values as string[][]) || [];
  const headerIdx = values.findIndex((row) => (row[0] || "").trim() === "Category");
  if (headerIdx < 0) return [];

  const rows: OpsFunnelRow[] = [];
  for (let r = headerIdx + 1; r < values.length; r++) {
    const row = values[r] || [];
    const funnel = (row[3] || "").trim();
    const jdCode = (row[6] || "").trim();
    if (!funnel || funnel === "테스트") continue;
    rows.push({
      category: (row[0] || "").trim(),
      funnel,
      code: (row[5] || "").trim(),
      jdCode,
      company: (row[7] || "").trim(),
      position: [(row[13] || "").trim(), (row[14] || "").trim()].filter(Boolean).join(" / "),
    });
  }
  return rows;
}

export interface EmployeeRow {
  category: string; // KR / Remote / VN
  status: string; // Ing(재직) / End(종료)
  code: string; // KTC Ops 코드 (R1, K1 ...)
  company: string;
  name: string;
  email: string;
  onboarding: string;
}

// KTC Ops — Employee 탭에서 실제 입사자 명단 읽기 (입사의 source of truth)
export async function readEmployees(): Promise<EmployeeRow[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: KTC_OPS_SHEET_ID,
    range: "'Employee'!A1:L300",
  });
  const values = (res.data.values as string[][]) || [];
  const headerIdx = values.findIndex(
    (row) => row.includes("Name") && row.some((c) => (c || "").toLowerCase().startsWith("e-mail"))
  );
  if (headerIdx < 0) return [];
  const header = values[headerIdx];
  const col = (name: string) => header.findIndex((c) => (c || "").toLowerCase().startsWith(name));
  const cName = col("name");
  const cEmail = col("e-mail");
  const cStatus = col("status");
  const cCategory = col("category");
  const cCode = col("code");
  const cCompany = col("company");
  const cOnboarding = col("onboarding");

  const rows: EmployeeRow[] = [];
  for (let r = headerIdx + 1; r < values.length; r++) {
    const row = values[r] || [];
    const name = (row[cName] || "").trim();
    const email = (row[cEmail] || "").trim();
    if (!name || !email) continue; // 합계 행·빈 행 스킵
    rows.push({
      category: (row[cCategory] || "").trim(),
      status: (row[cStatus] || "").trim(),
      code: (row[cCode] || "").trim(),
      company: (row[cCompany] || "").trim(),
      name,
      email,
      onboarding: (row[cOnboarding] || "").trim(),
    });
  }
  return rows;
}

// 매칭 완료(입사) 시 KTC Ops Employee 탭에 입사자 행 자동 추가 (편집자 권한 필요)
export async function appendEmployeeRow(data: {
  category?: string;
  code?: string;
  company: string;
  position?: string;
  name: string;
  email: string;
}): Promise<void> {
  const sheets = getSheets(true);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: KTC_OPS_SHEET_ID,
    range: "'Employee'!A1:L10",
  });
  const values = (res.data.values as string[][]) || [];
  const headerIdx = values.findIndex(
    (row) => row.includes("Name") && row.some((c) => (c || "").toLowerCase().startsWith("e-mail"))
  );
  if (headerIdx < 0) throw new Error("Employee tab header not found");
  const header = values[headerIdx];
  const col = (name: string) => header.findIndex((c) => (c || "").toLowerCase().startsWith(name.toLowerCase()));

  const maxCol = header.length - 1;
  const row: string[] = new Array(maxCol + 1).fill("");
  const set = (headerName: string, value: string | undefined) => {
    const i = col(headerName);
    if (value && i >= 0) row[i] = value;
  };
  const now = new Date();
  set("category", data.category);
  set("status", "Ing");
  set("code", data.code);
  set("company", data.company);
  set("position 1", data.position);
  set("name", data.name);
  set("e-mail", data.email);
  set("onboarding", `${now.getMonth() + 1}/${now.getDate()}`);

  await sheets.spreadsheets.values.append({
    spreadsheetId: KTC_OPS_SHEET_ID,
    range: "'Employee'!A1",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

function colLetter(idx: number): string {
  let s = "";
  let n = idx;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// Qualified 시트의 특정 행 Status(+Date updated) 업데이트
export async function updateQualifiedStatus(
  tab: string,
  rowIndex: number,
  status: string
): Promise<void> {
  const sheets = getSheets(true);
  const head = await sheets.spreadsheets.values.get({
    spreadsheetId: QUALIFIED_SHEET_ID,
    range: `'${tab}'!A1:T10`,
  });
  const header = detectHeader((head.data.values as string[][]) || []);
  if (!header || header.cols.status === undefined) {
    throw new Error(`Status column not found in tab "${tab}"`);
  }

  const data = [
    {
      range: `'${tab}'!${colLetter(header.cols.status)}${rowIndex}`,
      values: [[status]],
    },
  ];
  if (header.cols.dateUpdated !== undefined) {
    const now = new Date();
    data.push({
      range: `'${tab}'!${colLetter(header.cols.dateUpdated)}${rowIndex}`,
      values: [[`${now.getDate()}/${now.getMonth() + 1}`]],
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: QUALIFIED_SHEET_ID,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });
}

function normalizeCompany(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

// 회사명 표기가 탭 이름과 다른 경우 (한/영 표기, 철자 차이)
const COMPANY_TAB_ALIASES: Record<string, string> = {
  szupia: "Shupia",
  디자인교과서: "Designbook",
  오픈마인즈: "Openminds",
  커몬소셜: "Camon Social",
  하이퍼스타: "Hyperstar",
  하이퍼스타주: "Hyperstar",
  모엔: "Moen",
  사운드그래프: "SoundGraph",
  경북원룸: "GYEONGBOK ONE-ROOM",
  멋쟁이사자처럼: "LIKELION",
  likelion: "LIKELION",
  omicsyn: "Omnisync",
  헬로사이언스에듀: "Hello Science Edu",
  셀틱스: "Celltics Technology",
  씨드랩: "SeedLab",
  옐로우닥터: "Yellow Dr.",
  메타이노텍: "Metainnotech",
  원스퀘어: "ONSQUARE",
  위펀: "Wefun",
  앤드와이즈: "Andwise",
  무티스테이션: "Mutistation",
  넥사코드: "Nexacode",
  웰팟: "Wellpod",
  루미크래프트: "Lumicraft",
  지노시스: "Jinosys",
};

// 기업명으로 Qualified 시트의 탭 찾기 (별칭 → 정규화 일치 → 부분일치)
export async function findTabForCompany(company: string): Promise<string | null> {
  if (!company) return null;
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: QUALIFIED_SHEET_ID,
    fields: "sheets.properties.title",
  });
  const tabs = (meta.data.sheets || [])
    .map((s) => s.properties?.title || "")
    .filter((t) => t && !SKIP_TABS.has(t));
  const target = normalizeCompany(company);
  const alias = COMPANY_TAB_ALIASES[target];
  if (alias && tabs.includes(alias)) return alias;
  return (
    tabs.find((t) => normalizeCompany(t) === target) ||
    tabs.find((t) => normalizeCompany(t).includes(target) || target.includes(normalizeCompany(t))) ||
    null
  );
}

// Qualified 시트 탭에 후보자 행 추가 (헤더 매핑 기준으로 컬럼 채움)
export async function appendQualifiedRow(
  tab: string,
  data: {
    company: string;
    name: string;
    email: string;
    yoe?: string;
    position?: string;
    matchScore?: string;
    cvUrl?: string;
    status: string;
  }
): Promise<void> {
  const sheets = getSheets(true);
  const head = await sheets.spreadsheets.values.get({
    spreadsheetId: QUALIFIED_SHEET_ID,
    range: `'${tab}'!A1:T10`,
  });
  const header = detectHeader((head.data.values as string[][]) || []);
  if (!header || header.cols.name === undefined) {
    throw new Error(`Header not found in tab "${tab}"`);
  }

  const maxCol = Math.max(...Object.values(header.cols));
  const row: string[] = new Array(maxCol + 1).fill("");
  const set = (field: string, value: string | undefined) => {
    if (value && header.cols[field] !== undefined) row[header.cols[field]] = value;
  };
  const now = new Date();
  set("company", data.company);
  set("name", data.name);
  set("email", data.email);
  set("yoe", data.yoe);
  set("position", data.position);
  set("matchScore", data.matchScore);
  set("cvUrl", data.cvUrl);
  set("status", data.status);
  set("dateUpdated", `${now.getDate()}/${now.getMonth() + 1}`);

  await sheets.spreadsheets.values.append({
    spreadsheetId: QUALIFIED_SHEET_ID,
    range: `'${tab}'!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// 이메일 우선, 이름 폴백으로 후보자의 시트 행 찾기
export function findQualifiedRow(
  rows: QualifiedRow[],
  email: string | null,
  name: string
): QualifiedRow | null {
  const e = (email || "").trim().toLowerCase();
  if (e) {
    const byEmail = rows.find((r) => r.email.toLowerCase() === e);
    if (byEmail) return byEmail;
  }
  const n = normalizeName(name);
  if (!n) return null;
  return rows.find((r) => normalizeName(r.name) === n) || null;
}

// 앱 pipeline_status → 시트 Status 표기 (시트가 실제로 쓰는 어휘 그대로)
export const PIPELINE_TO_SHEET_STATUS: Record<string, string> = {
  ready_to_forward: "ready to forward",
  sent_to_company: "sent to company",
  interviewing: "company interviewed",
  offer: "offer",
  final_passed: "passed",
  rejected: "rejected",
};

// 시트 Status → 앱 pipeline_status (역방향 동기화용)
export const SHEET_TO_PIPELINE: Record<string, string> = {
  "ready to forward": "ready_to_forward",
  "sent to company": "sent_to_company",
  "company interviewed": "interviewing",
  interviewing: "interviewing",
  offer: "offer",
  "not selected": "rejected",
  rejected: "rejected",
  passed: "final_passed",
};

// 파이프라인 진행 순서 (역방향 동기화 시 앞 단계로 되돌리지 않기 위한 랭크)
export const PIPELINE_RANK: Record<string, number> = {
  new: 0,
  passed: 1,
  ready_to_forward: 2,
  sent_to_company: 3,
  interviewing: 4,
  offer: 5,
  final_passed: 6,
};
