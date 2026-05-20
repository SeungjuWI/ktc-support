/**
 * Access Code 일괄 발급 (CLI)
 *
 * 사용: npx tsx scripts/create-interview-codes.ts [개수]
 * 예: npx tsx scripts/create-interview-codes.ts 20
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "KTC-";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

async function main() {
  const count = parseInt(process.argv[2] || "10", 10);
  if (isNaN(count) || count <= 0 || count > 500) {
    console.error("개수는 1~500 사이의 숫자여야 합니다.");
    process.exit(1);
  }

  console.log(`${count}개 access code 생성 중...\n`);

  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code = generateCode();
    let attempts = 0;

    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("interview_sessions")
        .select("id")
        .eq("access_code", code)
        .maybeSingle();

      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const { error } = await supabase.from("interview_sessions").insert({
      access_code: code,
      status: "pending",
    });

    if (error) {
      console.error(`  ${code} 생성 실패:`, error.message);
      continue;
    }

    codes.push(code);
    console.log(`  ${code}`);
  }

  console.log(`\n생성된 코드 (${codes.length}개):\n`);
  console.log(codes.join("\n"));
  console.log("\n이 코드를 지원자에게 이메일/메시지로 전달하세요.");
  console.log(`지원자 접속 URL: https://vtm-neon.vercel.app/interview\n`);
}

main().catch(console.error);
