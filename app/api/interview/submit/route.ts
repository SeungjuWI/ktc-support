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
    const formData = await req.formData();
    const code = (formData.get("code") as string)?.toUpperCase();
    const questionId = formData.get("questionId") as string;
    const questionOrder = parseInt(formData.get("questionOrder") as string, 10);
    const durationSec = parseInt((formData.get("durationSec") as string) || "0", 10);
    const audioFile = formData.get("audio") as File;
    const mimeType = (formData.get("mimeType") as string) || "audio/webm";

    if (!code || !questionId || !audioFile) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .select("id")
      .eq("access_code", code)
      .eq("status", "in_progress")
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: "Session not found or already completed" },
        { status: 404 }
      );
    }

    const { data: question } = await supabase
      .from("interview_questions")
      .select("*")
      .eq("id", questionId)
      .single();

    if (!question) {
      return NextResponse.json(
        { success: false, message: "Question not found" },
        { status: 404 }
      );
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
    const audioPath = `sessions/${session.id}/${questionId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("interviews")
      .upload(audioPath, audioBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, message: "Upload failed" },
        { status: 500 }
      );
    }

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
      transcript = "";
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

    const { error: insertError } = await supabase
      .from("interview_responses")
      .upsert(
        {
          session_id: session.id,
          question_id: questionId,
          question_order: questionOrder,
          audio_storage_path: audioPath,
          transcript,
          transcript_language: detectedLang,
          score,
          score_reasoning: reasoning,
          duration_seconds: durationSec,
        },
        { onConflict: "session_id,question_id" }
      );

    if (insertError) {
      console.error("DB insert error:", insertError);
      return NextResponse.json(
        { success: false, message: "Database error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, score });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
