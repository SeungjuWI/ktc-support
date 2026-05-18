export interface ScreeningResult {
  yoe_check: string;
  score: number;
  verdict: "PASS" | "FAIL";
  strengths_en: string[];
  strengths_ko: string[];
  gaps_en: string[];
  gaps_ko: string[];
  role: string;
  years_exp: number;
  location: string;
  top_skills: string[];
  career_history: { company: string; position: string; period: string }[];
  abilities: { technical: number; english: number; collaboration: number; stability: number; growth: number };
  summary_en: string;
  summary_ko: string;
  raw_response: string;
  pdfBuffer?: Buffer;
}

function toDirectDownloadUrl(url: string): string {
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) {
    return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
  }
  return url;
}

// Google Drive API로 파일 다운로드 (서비스 계정 인증)
async function downloadFromGDrive(fileId: string): Promise<Buffer | null> {
  try {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data as ArrayBuffer);
  } catch (err) {
    console.error("GDrive download failed:", fileId, err instanceof Error ? err.message : err);
    return null;
  }
}

async function downloadPdf(url: string): Promise<Buffer | null> {
  try {
    // Google Drive 링크 → Drive API로 다운로드
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
    const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    const driveFileId = driveMatch?.[1] || openMatch?.[1];

    if (driveFileId) {
      const buf = await downloadFromGDrive(driveFileId);
      if (buf && (buf.subarray(0, 5).toString().includes("PDF") || buf.length > 1000)) {
        return buf;
      }
    }

    // 직접 다운로드 (Supabase storage 등)
    const directUrl = toDirectDownloadUrl(url);
    const res = await fetch(directUrl, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    const buffer = Buffer.from(await res.arrayBuffer());

    if (contentType.includes("pdf") || buffer.subarray(0, 5).toString() === "%PDF-") {
      return buffer;
    }

    if (contentType.includes("html")) {
      const html = buffer.toString("utf-8");
      const confirmMatch = html.match(/confirm=([^&"]+)/);
      if (confirmMatch) {
        const confirmUrl = `${directUrl}&confirm=${confirmMatch[1]}`;
        const retryRes = await fetch(confirmUrl, { redirect: "follow" });
        if (retryRes.ok) {
          const retryBuffer = Buffer.from(await retryRes.arrayBuffer());
          if (retryBuffer.subarray(0, 5).toString() === "%PDF-") {
            return retryBuffer;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

const PROMPT = `You are a senior recruiter. Analyze this CV against the JD and extract a structured profile.

## JD
{JD_TEXT}

## CV
(attached as PDF file)

— TASK 1: YOE CHECK & SCORING —
1. Extract the required YOE from the JD.
2. From the CV, count years in that exact role or direct equivalent.
3. YOE window = required ± 1 year. Outside = FAIL.
4. Scoring (if YOE passes) — use the FULL 0-100 scale with granular scores, NOT rounded to 5 or 10:
   - Requirements match: 0-40pts (how well CV matches JD requirements)
   - Experience relevance: 0-30pts (how relevant past work is)
   - Skills alignment: 0-20pts (how well technical skills match)
   - Career trajectory: 0-10pts (growth pattern, promotions, consistency)
   Output each sub-score individually in "score_breakdown", then sum them for "score".
   Each sub-score MUST reflect the actual CV content — different candidates MUST get different scores.
   NEVER default to the same scores across candidates.

— TASK 2: PROFILE EXTRACTION —
Extract the following from the CV. Be thorough and specific.

Return ONLY valid JSON:
{
  "yoe_check": "X yrs in role → PASS/FAIL",
  "score_breakdown": {
    "requirements_match": 0-40,
    "experience_relevance": 0-30,
    "skills_alignment": 0-20,
    "career_trajectory": 0-10
  },
  "score": "SUM of score_breakdown (0-100)",
  "verdict": "PASS" or "FAIL",
  "strengths_en": ["strength 1 in English", "strength 2", "strength 3"],
  "strengths_ko": ["강점 1 한국어", "강점 2", "강점 3"],
  "gaps_en": ["gap 1 in English", "gap 2"],
  "gaps_ko": ["약점 1 한국어", "약점 2"],
  "role": "the candidate's primary role (e.g. Frontend Developer, UI/UX Designer, Marketing Manager)",
  "years_exp": number of total years of professional experience,
  "location": "city from CV (e.g. Ho Chi Minh City, Hanoi)",
  "top_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "career_history": [
    {"company": "Company Name", "position": "Job Title", "period": "Jun 2023 - Present"},
    {"company": "Company Name", "position": "Job Title", "period": "Jan 2021 - May 2023"}
  ],
  "abilities": {
    "technical": 0-100,
    "english": 0-100,
    "collaboration": 0-100,
    "stability": 0-100,
    "growth": 0-100
  },
  "summary_en": "1-2 sentence professional summary in English. NEVER include the candidate's name.",
  "summary_ko": "1-2 sentence professional summary in Korean. NEVER include the candidate's name."
}

IMPORTANT:
- "role" should be the actual role, not "개발자" appended. Use English role titles.
- "top_skills" must be specific technical skills or tools from the CV (e.g. "React", "CapCut", "Figma"), NOT generic descriptions.
- "career_history" must list ALL work experiences from the CV.
- "abilities" scores (use precise numbers like 63, 77, 84 — NOT round numbers): technical=skill level, english=English proficiency, collaboration=teamwork indicators, stability=job tenure consistency, growth=career progression.
- "strengths_ko" and "gaps_ko" and "summary_ko" must be in natural Korean.
- "strengths_en" and "gaps_en" and "summary_en" must be in English.
- Return ONLY the JSON object. No other text.`;

export async function screenCandidate(
  cvUrl: string,
  jdText: string
): Promise<ScreeningResult | { error: string }> {
  const pdfBuffer = await downloadPdf(cvUrl);

  if (!pdfBuffer) {
    return { error: "PDF 다운로드 실패: " + cvUrl.substring(0, 60) };
  }

  const base64Pdf = pdfBuffer.toString("base64");
  const prompt = PROMPT.replace("{JD_TEXT}", jdText);

  // 최대 3회 재시도
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "file",
                  file: {
                    filename: "cv.pdf",
                    file_data: `data:application/pdf;base64,${base64Pdf}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        }),
      });

      if (res.status === 429) {
        const wait = Math.pow(2, attempt + 1) * 1000;
        console.log(`Rate limited, waiting ${wait}ms...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        console.error("OpenAI API error:", err);
        return { error: "OpenAI API 오류: " + res.status };
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";

      const result = parseScreeningResult(text);
      result.pdfBuffer = pdfBuffer;
      return result;
    } catch (err) {
      console.error("OpenAI request failed:", err);
      if (attempt === 2) return { error: "OpenAI 요청 실패: " + (err instanceof Error ? err.message : "unknown") };
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return { error: "OpenAI 요청 3회 실패" };
}

function parseScreeningResult(text: string): ScreeningResult {
  try {
    const json = JSON.parse(text);
    return {
      yoe_check: json.yoe_check || "Unknown",
      score: json.score_breakdown
        ? (json.score_breakdown.requirements_match || 0) + (json.score_breakdown.experience_relevance || 0) + (json.score_breakdown.skills_alignment || 0) + (json.score_breakdown.career_trajectory || 0)
        : (json.score || 0),
      verdict: json.verdict === "PASS" ? "PASS" : "FAIL",
      strengths_en: (json.strengths_en || json.strengths || []).slice(0, 3),
      strengths_ko: (json.strengths_ko || []).slice(0, 3),
      gaps_en: (json.gaps_en || json.gaps || []).slice(0, 2),
      gaps_ko: (json.gaps_ko || []).slice(0, 2),
      role: json.role || "Unknown",
      years_exp: json.years_exp || 0,
      location: json.location || "",
      top_skills: (json.top_skills || []).slice(0, 5),
      career_history: (json.career_history || []).slice(0, 5),
      abilities: {
        technical: json.abilities?.technical || 0,
        english: json.abilities?.english || 0,
        collaboration: json.abilities?.collaboration || 0,
        stability: json.abilities?.stability || 0,
        growth: json.abilities?.growth || 0,
      },
      summary_en: json.summary_en || json.summary || "",
      summary_ko: json.summary_ko || "",
      raw_response: text,
    };
  } catch {
    const scoreMatch = text.match(/score["\s:]+(\d+)/i);
    const verdictMatch = text.match(/verdict["\s:]+["']?(PASS|FAIL)/i);
    return {
      yoe_check: "Parse error",
      score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
      verdict: verdictMatch ? (verdictMatch[1].toUpperCase() as "PASS" | "FAIL") : "FAIL",
      strengths_en: [],
      strengths_ko: [],
      gaps_en: [],
      gaps_ko: [],
      role: "Unknown",
      years_exp: 0,
      location: "",
      top_skills: [],
      career_history: [],
      abilities: { technical: 0, english: 0, collaboration: 0, stability: 0, growth: 0 },
      summary_en: "",
      summary_ko: "",
      raw_response: text,
    };
  }
}
