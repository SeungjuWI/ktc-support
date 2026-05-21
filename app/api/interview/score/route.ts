import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { transcribeAudio, scoreAnswer } from "@/lib/interview/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, questionId, audioPath, mimeType } = await req.json();
    if (!sessionId || !questionId || !audioPath) {
      return NextResponse.json({ success: false, message: "Missing fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: question } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("id", questionId)
      .single();

    if (!question) {
      return NextResponse.json({ success: false, message: "Question not found" }, { status: 404 });
    }

    const { data: fileData, error: dlError } = await supabase.storage
      .from("interviews")
      .download(audioPath);

    if (dlError || !fileData) {
      console.error("Audio download error:", dlError);
      return NextResponse.json({ success: false, message: "Audio not found" }, { status: 404 });
    }

    const audioBuffer = Buffer.from(await fileData.arrayBuffer());
    const ext = (mimeType || "audio/webm").includes("mp4") ? "mp4" : (mimeType || "").includes("ogg") ? "ogg" : "webm";

    const expectedLang: "vi" | "en" =
      questionId === "q1_language" || questionId === "q6_certificates" ? "en" : "vi";

    let transcript = "";
    let detectedLang = expectedLang;
    try {
      const result = await transcribeAudio(audioBuffer, `audio.${ext}`, expectedLang);
      transcript = result.text;
      detectedLang = result.detectedLanguage as "vi" | "en";
    } catch (err) {
      console.error("STT error:", err);
    }

    let score = 1;
    let reasoning = "채점 실패";
    if (transcript.trim().length > 0) {
      try {
        const result = await scoreAnswer({
          questionText: question.question_text_en || question.question_text_vi || "",
          category: question.category,
          rubric: question.rubric,
          transcript,
          expectedLanguage: expectedLang,
        });
        score = result.score;
        reasoning = result.reasoning;
      } catch (err) {
        console.error("Scoring error:", err);
      }
    } else {
      reasoning = "답변이 비어있거나 음성 인식 실패";
    }

    const { error: updateError } = await supabase
      .from("interview_responses")
      .update({
        transcript,
        transcript_language: detectedLang,
        score,
        score_reasoning: reasoning,
      })
      .eq("session_id", sessionId)
      .eq("question_id", questionId);

    if (updateError) {
      console.error("Score update error:", updateError);
      return NextResponse.json({ success: false, message: "DB update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, score });
  } catch (err) {
    console.error("Score error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
