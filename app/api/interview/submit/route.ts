import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

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

    const { error: insertError } = await supabase
      .from("interview_responses")
      .upsert(
        {
          session_id: session.id,
          question_id: questionId,
          question_order: questionOrder,
          audio_storage_path: audioPath,
          transcript: "",
          transcript_language: "vi",
          score: null,
          score_reasoning: "채점 대기중",
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

    // STT + 채점을 별도 서버리스 함수로 fire-and-forget
    const scoreUrl = new URL("/api/interview/score", req.url);
    fetch(scoreUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        questionId,
        audioPath,
        mimeType,
      }),
    }).catch((err) => console.error("Score trigger failed:", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
