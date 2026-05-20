/**
 * lib/interview/openai.ts
 *
 * Whisper STT + GPT-4.1-mini 채점 로직.
 * 베팀 기존 패턴(lib/portfolio-screening.ts)과 동일하게 fetch 직접 호출.
 */

// ============================================================================
// 1. Whisper STT — 음성 → 텍스트
// ============================================================================
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  language: "vi" | "en"
): Promise<{ text: string; detectedLanguage: string }> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], {
    type: filename.endsWith(".mp4") ? "audio/mp4" : "audio/webm",
  });
  formData.append("file", blob, filename);
  formData.append("model", "whisper-1");
  formData.append("language", language);
  formData.append("response_format", "verbose_json");
  formData.append("temperature", "0");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Whisper API error:", err);
    throw new Error("Whisper API error: " + res.status);
  }

  const data = await res.json();
  return {
    text: data.text || "",
    detectedLanguage: data.language || language,
  };
}

// ============================================================================
// 2. GPT-4.1-mini로 답변 채점 (rubric 기반)
// ============================================================================
export async function scoreAnswer(params: {
  questionText: string;
  category: string;
  rubric: { "1-3": string; "4-6": string; "7-10": string };
  transcript: string;
  expectedLanguage: "vi" | "en";
}): Promise<{ score: number; reasoning: string }> {
  const systemPrompt = `You are an experienced HR interviewer evaluating candidates for the KTC (Korean Talent Connect) program — a program that matches Vietnamese talent with Korean companies.

Your job: score a candidate's spoken answer (transcribed) on a 1-10 scale based on the rubric.

Scoring rubric for this question (category: ${params.category}):
- Score 1-3: ${params.rubric["1-3"]}
- Score 4-6: ${params.rubric["4-6"]}
- Score 7-10: ${params.rubric["7-10"]}

Important rules:
1. Expected answer language: ${params.expectedLanguage === "vi" ? "Vietnamese" : "English"}.
2. If candidate answered in the wrong language, deduct points.
3. If transcript is very short (1-2 words) or empty, score 1.
4. Be objective and base your score strictly on the rubric.
5. Watch for AI-generated answers (overly polished, generic platitudes, perfect grammar with no personal specifics, unnatural fluency). If suspected, mention it in reasoning and lean toward lower scores.
6. Output STRICT JSON only, no markdown, no extra text.

Output format:
{
  "score": <integer 1-10>,
  "reasoning": "<2-4 sentence explanation in English, citing specific parts of the answer>"
}`;

  const userPrompt = `Question: ${params.questionText}

Candidate's transcribed answer:
"""
${params.transcript}
"""

Score this answer.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Scoring API error:", err);
    throw new Error("Scoring API error: " + res.status);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  let parsed: { score?: number | string; reasoning?: string } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("Failed to parse score JSON:", content);
  }

  const score = Math.max(1, Math.min(10, parseInt(String(parsed.score ?? 1), 10) || 1));
  return {
    score,
    reasoning: parsed.reasoning || "채점 사유 생성 실패",
  };
}

// ============================================================================
// 3. 최종 종합 코멘트
// ============================================================================
export async function generateFinalSummary(params: {
  candidateName: string;
  responses: Array<{
    category: string;
    score: number;
    reasoning: string;
    transcript: string;
  }>;
  totalScore: number;
  maxScore: number;
}): Promise<string> {
  const responseSummary = params.responses
    .map(
      (r, i) =>
        `[Q${i + 1}] ${r.category} (${r.score}/10): ${r.reasoning}`
    )
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "당신은 KTC 프로그램(베트남 인재 ↔ 한국 기업 매칭)의 채용 담당자입니다. 후보자의 면접 결과를 종합하여 한국어로 4-6문장의 종합 코멘트를 작성하세요. 강점, 약점, 추천 여부를 포함하되 객관적이고 간결하게.",
        },
        {
          role: "user",
          content: `후보자: ${params.candidateName}
총점: ${params.totalScore}/${params.maxScore} (${Math.round(
            (params.totalScore / params.maxScore) * 100
          )}%)
합격 기준: 36/70 (50%) 이상 → PASS 추천

질문별 평가:
${responseSummary}

종합 코멘트를 한국어 4-6문장으로 작성하세요.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Summary API error:", err);
    throw new Error("Summary API error: " + res.status);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}
