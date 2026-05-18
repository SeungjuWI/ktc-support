import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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

    const fullName = get("full_name");
    const email = get("email");

    // 이름 없으면 스킵
    if (!fullName) continue;

    // 고유 식별자: ID 우선, 없으면 이메일
    const rowId = get("_id") || email || `${sheetName}-row-${i}`;

    candidates.push({
      full_name: fullName,
      email,
      phone: get("phone"),
      city: get("city"),
      university: get("university"),
      graduation_year: get("graduation_year"),
      position: get("position") || get("applied_job"),
      yoe: get("yoe"),
      cv_url: get("cv_url"),
      portfolio_url: get("portfolio_url"),
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
