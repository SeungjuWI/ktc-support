/**
 * Google Cloud TTS로 질문 음성 사전 생성
 *
 * 실행: npx tsx scripts/generate-interview-tts.ts
 *
 * 사전 준비:
 *   1. npm install @google-cloud/text-to-speech
 *   2. GCP 콘솔에서 Text-to-Speech API 활성화 확인
 *   3. .env.local에 GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY 있어야 함
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import textToSpeech from "@google-cloud/text-to-speech";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

async function synthesizeQuestion(
  textEn: string,
  textVi: string
): Promise<Buffer> {
  const [enResponse] = await ttsClient.synthesizeSpeech({
    input: { text: textEn },
    voice: {
      languageCode: "en-US",
      name: "en-US-Neural2-F",
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.95,
    },
  });

  const [viResponse] = await ttsClient.synthesizeSpeech({
    input: { text: textVi },
    voice: {
      languageCode: "vi-VN",
      name: "vi-VN-Neural2-A",
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.95,
    },
  });

  const enBuf = Buffer.from(enResponse.audioContent as Uint8Array);
  const viBuf = Buffer.from(viResponse.audioContent as Uint8Array);

  return Buffer.concat([enBuf, viBuf]);
}

async function main() {
  console.log("질문 목록 조회 중...\n");

  const { data: questions, error } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("is_active", true)
    .order("order_num");

  if (error || !questions) {
    console.error("질문 조회 실패:", error);
    process.exit(1);
  }

  console.log(`${questions.length}개 질문 발견\n`);

  for (const q of questions) {
    console.log(`[${q.id}] TTS 생성 중...`);

    try {
      const mp3Buffer = await synthesizeQuestion(
        q.question_text_en || "",
        q.question_text_vi || ""
      );

      const path = `tts/${q.id}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("interviews")
        .upload(path, mp3Buffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error(`  업로드 실패:`, uploadError);
        continue;
      }

      const { error: updateError } = await supabase
        .from("interview_questions")
        .update({ tts_audio_path: path })
        .eq("id", q.id);

      if (updateError) {
        console.error(`  DB 업데이트 실패:`, updateError);
        continue;
      }

      console.log(`  ${path} (${(mp3Buffer.length / 1024).toFixed(1)} KB)`);
    } catch (err: any) {
      console.error(`  에러:`, err?.message || err);
      if (err?.message?.includes("voice")) {
        console.log(`  vi-VN-Neural2-A가 미지원이면 코드에서 "vi-VN-Standard-A"로 변경 후 재실행`);
      }
    }
  }

  console.log("\n완료!\n");
  console.log("다음 단계: npx tsx scripts/create-interview-codes.ts 10");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
