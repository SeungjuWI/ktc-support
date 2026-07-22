import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export interface RawCandidate {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  university: string;
  graduation_year: string;
  position: string;
  yoe: string;
  cv_url: string;
  portfolio_url: string;
  skills: string;
  source: string;
  applied_date: string;
  applied_job: string;
  applied_company: string;
  sheet_source: string;
  sheet_row_identifier: string;
}

// 탭별 컬럼 매핑
type ColumnMap = Record<string, string>;

const COLUMN_MAPS: Record<string, ColumnMap> = {
  // FYI 자가등록 인재 (KTC 채용공고에 지원한 후보자). 헤더는 베트남어.
  FYI: {
    ID: "_id",
    "Ngày nộp": "applied_date",
    "Họ & Tên": "full_name",
    Email: "email",
    "Vị trí ứng tuyển": "position",
    "Applied Job": "applied_job",
    "Applied Company": "applied_company",
    "Năm kinh nghiệm": "yoe",
    "CV URL": "cv_url",
    "Trạng thái": "_status",
  },
  "landing-page": {
    "Họ & Tên": "full_name",
    Email: "email",
    "Số điện thoại": "phone",
    "Thành phố": "city",
    "Trường đại học": "university",
    "Vị trí ứng tuyển": "position",
    "Năm kinh nghiệm": "yoe",
    "CV URL": "cv_url",
    "Portfolio URL": "portfolio_url",
    "Ngày nộp": "applied_date",
    "Applied Job": "applied_job",
    "Applied Company": "applied_company",
    Nguồn: "source",
    ID: "_id",
  },
  "ITviec-api": {
    "Họ & Tên": "full_name",
    Email: "email",
    "Số điện thoại": "phone",
    "Job Title": "applied_job",
    "Link CV": "cv_url",
    "Ngày nộp": "applied_date",
    "Trạng thái": "_status",
    "Application ID": "_id",
  },
  "top-dev": {
    "Candidate Fullname": "full_name",
    "Candidate Email": "email",
    "Candidate Phone number": "phone",
    "Candidate Location": "city",
    "Candidate Skills": "skills",
    "Candidate YOE": "yoe",
    "Job title": "applied_job",
    "Applied date": "applied_date",
    "View CV": "cv_url",
    Status: "_status",
    ID: "_id",
  },
  // jobs-go: 인턴/신입 무료 수집 플랫폼. 헤더 베트남어. (같은 스프레드시트의 새 탭)
  "jobs-go": {
    "Họ tên": "full_name",
    Email: "email",
    "Số điện thoại": "phone",
    "Địa chỉ": "city",
    "Học vấn": "university",
    "Thời gian": "applied_date",
    "Link CV": "cv_url",
    "Applied Job": "position", // 직무 포지션명
    "Job ID": "applied_job", // JD 코드 (matchJobCode 매칭용)
    "Applied Company": "applied_company",
    "Trạng thái": "_status",
  },
  // top-cv: 신규 채용 플랫폼. 헤더 베트남어(앰퍼샌드 없는 "Họ Tên"), CV는 Link xem CV 열.
  "top-cv": {
    "Họ Tên": "full_name",
    Email: "email",
    "Số điện thoại": "phone",
    "Địa chỉ": "city",
    "Link xem CV": "cv_url",
    "Ngày tiếp nhận": "applied_date",
    "Applied Job": "position", // 직무 포지션명
    "Job ID": "applied_job", // JD 코드 (matchJobCode 매칭용, 예: CS2203)
    "Applied Company": "applied_company",
    "Trạng thái": "_status",
  },
  // Vieclam24h: 베트남 채용 플랫폼. 헤더 베트남어. email/phone 없음(이름으로 dedup).
  // CV는 "Link" 열(구글드라이브). Applied Job/Job ID/Applied Company 는 top-cv 패턴과 동일.
  Vieclam24h: {
    Tên: "full_name",
    "Kinh nghiệm": "yoe",
    "Trình độ học vấn": "university",
    "Địa chỉ làm việc mong muốn": "city",
    "Ngày ứng tuyển": "applied_date",
    Link: "cv_url",
    "Applied Job": "position", // 직무 포지션명
    "Job ID": "applied_job", // JD 코드 (matchJobCode 매칭용, 예: SMG3101)
    "Applied Company": "applied_company",
    "Trạng thái": "_status",
  },
  // glint, LinkedIn, YBOX 는 동일한 형식
  _default: {
    "Full Name": "full_name",
    Email: "email",
    Phone: "phone",
    City: "city",
    University: "university",
    "Graduation year": "graduation_year",
    Position: "position",
    "YOE (years)": "yoe",
    "CV Link": "cv_url",
    "Github/ Port Link": "portfolio_url",
    Source: "source",
    "Date Submitted": "applied_date",
    "Applied Jobs": "applied_job",
  },
};

function getColumnMap(sheetName: string): ColumnMap {
  return COLUMN_MAPS[sheetName] || COLUMN_MAPS._default;
}

// 제외할 탭들
const SKIP_TABS = ["Form Responses 1", "log"];

export async function getSheetTabs(): Promise<string[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  return (
    meta.data.sheets
      ?.map((s) => s.properties?.title || "")
      .filter((name) => name && !SKIP_TABS.includes(name)) || []
  );
}

// 셀의 표시 텍스트가 아닌 "하이퍼링크 URL"을 [행][열] 2차원으로 추출.
// (예: "Xem CV ứng viên" 처럼 링크 라벨만 보이고 실제 URL은 하이퍼링크에 숨은 경우)
async function fetchHyperlinks(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string
): Promise<string[][]> {
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      ranges: [`'${sheetName}'!A1:Z`],
      fields: "sheets(data(rowData(values(hyperlink))))",
    });
    const rowData = res.data.sheets?.[0]?.data?.[0]?.rowData || [];
    return rowData.map((r) => (r.values || []).map((c) => c.hyperlink || ""));
  } catch {
    return [];
  }
}

export async function fetchSheetData(
  sheetName: string
): Promise<RawCandidate[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'!A1:Z`,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];

  // 하이퍼링크 URL 맵 (cv_url / portfolio_url 가 링크 라벨일 때 실제 URL 복구용)
  const hyperlinks = await fetchHyperlinks(sheets, sheetName);

  const headers = rows[0];
  const columnMap = getColumnMap(sheetName);

  // 헤더 → 필드 인덱스 매핑
  const fieldIndexMap: Record<string, number> = {};
  headers.forEach((header: string, idx: number) => {
    const field = columnMap[header.trim()];
    if (field) fieldIndexMap[field] = idx;
  });

  const candidates: RawCandidate[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (field: string) => {
      const idx = fieldIndexMap[field];
      return idx !== undefined ? (row[idx] || "").trim() : "";
    };
    // URL 필드는 표시 텍스트가 http로 시작 안 하면 하이퍼링크 URL을 우선 사용
    const getUrl = (field: string) => {
      const text = get(field);
      if (/^https?:\/\//i.test(text)) return text;
      const idx = fieldIndexMap[field];
      const link = idx !== undefined ? hyperlinks[i]?.[idx] : "";
      return link || text;
    };

    const fullName = get("full_name");
    const email = get("email");

    // 이름 없으면 스킵
    if (!fullName) continue;

    // 고유 식별자: 이메일 우선, 없으면 이름+폰, 최후에 이름+탭 (행번호 제거 — 행 변경 시 중복 방지)
    const phone = get("phone");
    const rowId = email
      ? email
      : phone
        ? `${fullName}-${phone}`
        : `${sheetName}-${fullName}`;

    candidates.push({
      full_name: fullName,
      email,
      phone: get("phone"),
      city: get("city"),
      university: get("university"),
      graduation_year: get("graduation_year"),
      position: get("position") || get("applied_job"),
      yoe: get("yoe"),
      cv_url: getUrl("cv_url"),
      portfolio_url: getUrl("portfolio_url"),
      skills: get("skills"),
      source: get("source") || sheetName,
      applied_date: get("applied_date"),
      applied_job: get("applied_job"),
      applied_company: get("applied_company"),
      sheet_source: sheetName,
      sheet_row_identifier: rowId,
    });
  }

  return candidates;
}

export async function fetchAllCandidates(): Promise<RawCandidate[]> {
  const tabs = await getSheetTabs();
  const allCandidates: RawCandidate[] = [];

  for (const tab of tabs) {
    const candidates = await fetchSheetData(tab);
    allCandidates.push(...candidates);
  }

  return allCandidates;
}
